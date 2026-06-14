const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { User, OTP } = require('./auth.model');
const config = require('../../config/env');
const { getRedis } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');
const { timingSafeEqual, generateSecureOTP } = require('../../utils/sanitize');

// ── Constants ──
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

class AuthService {
  /**
   * Register a new user.
   * No OTP verification — account is active immediately.
   */
  async register({ email, password, name, role }) {
    // Validate college email domain
    const domain = config.college.emailDomain;
    if (domain && !email.endsWith(domain)) {
      throw new AppError(
        errorCodes.AUTH_INVALID_EMAIL_DOMAIN,
        `Only ${domain} email addresses are allowed`,
        400
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError(errorCodes.AUTH_EMAIL_EXISTS, 'Email already registered', 409);
    }

    // Create user — email is verified by default (no OTP flow)
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash: password, // Pre-save hook handles bcrypt hashing
      name,
      role,
      is_email_verified: true,
    });

    // Generate tokens so user is logged in immediately
    const tokens = await this._generateTokens(user);

    logger.info('User registered', { userId: user._id, email: user.email });

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_email_verified: true,
      },
      ...tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check account lockout
    await this._checkAccountLockout(normalizedEmail);

    // Find user with password field included
    const user = await User.findOne({ email: normalizedEmail }).select('+password_hash');

    if (!user) {
      // Record failed attempt even for non-existent users (prevent user enumeration via timing)
      await this._recordFailedLogin(normalizedEmail);
      throw new AppError(errorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError(errorCodes.AUTH_ACCOUNT_SUSPENDED, 'Account has been suspended', 403);
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await this._recordFailedLogin(normalizedEmail, user._id);
      throw new AppError(errorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Successful login — clear failed attempts
    await this._clearFailedLogins(normalizedEmail);

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this._generateTokens(user);

    logger.info('User logged in', { userId: user._id });

    // Remove password from response
    const userObj = user.toJSON();

    return { user: userObj, ...tokens };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    const redis = getRedis();

    // Hash the provided token for O(1) reverse lookup
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // O(1) lookup: reverse key maps tokenHash → userId
    const userId = await redis.get(`auth:refresh_lookup:${tokenHash}`);

    if (!userId) {
      throw new AppError(errorCodes.AUTH_REFRESH_TOKEN_INVALID, 'Invalid or expired refresh token', 401);
    }

    // Verify the forward key still matches (prevents stale lookups)
    const storedHash = await redis.get(`auth:refresh:${userId}`);
    if (storedHash !== tokenHash) {
      await redis.del(`auth:refresh_lookup:${tokenHash}`);
      throw new AppError(errorCodes.AUTH_REFRESH_TOKEN_INVALID, 'Invalid or expired refresh token', 401);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user || !user.is_active) {
      await this._deleteRefreshTokenKeys(redis, userId, tokenHash);
      throw new AppError(errorCodes.AUTH_REFRESH_TOKEN_INVALID, 'User not found or suspended', 401);
    }

    // Rotate: delete old refresh token keys, generate new pair
    await this._deleteRefreshTokenKeys(redis, userId, tokenHash);

    const tokens = await this._generateTokens(user);

    logger.info('Token refreshed', { userId: user._id });

    return tokens;
  }

  /**
   * Logout — invalidate refresh token
   */
  async logout(userId) {
    const redis = getRedis();
    // Clean up both forward and reverse refresh token keys
    const storedHash = await redis.get(`auth:refresh:${userId}`);
    if (storedHash) {
      await this._deleteRefreshTokenKeys(redis, userId, storedHash);
    }
    logger.info('User logged out', { userId });
  }

  /**
   * Change password
   */
  async changePassword(userId, { oldPassword, newPassword }) {
    const user = await User.findById(userId).select('+password_hash');
    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw new AppError(errorCodes.AUTH_INVALID_CREDENTIALS, 'Current password is incorrect', 400);
    }

    user.password_hash = newPassword; // Pre-save hook hashes it
    await user.save();

    // Invalidate refresh token (force re-login)
    const redis = getRedis();
    const storedHash = await redis.get(`auth:refresh:${userId}`);
    if (storedHash) {
      await this._deleteRefreshTokenKeys(redis, userId, storedHash);
    }

    logger.info('Password changed', { userId });
  }

  /**
   * Get current user profile
   */
  async getMe(userId) {
    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    }
    return user;
  }

  /**
   * Forgot password — send OTP to email
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists — always return success message
      return { message: 'If an account exists with this email, an OTP has been sent.' };
    }

    await this._generateOTP(email);
    logger.info('Forgot password OTP sent', { email: email.toLowerCase() });
    return { message: 'If an account exists with this email, an OTP has been sent.' };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword({ email, otp, newPassword }) {
    const normalizedEmail = email.toLowerCase();

    // Verify OTP first
    const otpRecord = await OTP.findOne({ email: normalizedEmail });

    if (!otpRecord) {
      throw new AppError(errorCodes.AUTH_OTP_EXPIRED, 'OTP has expired', 400);
    }

    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ email: normalizedEmail });
      throw new AppError(errorCodes.AUTH_OTP_MAX_ATTEMPTS, 'Maximum OTP attempts exceeded', 400);
    }

    // Timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(otpRecord.code, otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new AppError(errorCodes.AUTH_OTP_INVALID, 'Incorrect OTP code', 400);
    }

    // Update password
    const user = await User.findOne({ email: normalizedEmail }).select('+password_hash');
    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    user.password_hash = newPassword;
    await user.save();

    // Cleanup OTP and invalidate any existing sessions
    await OTP.deleteOne({ email: normalizedEmail });
    const redis = getRedis();
    const storedRefreshHash = await redis.get(`auth:refresh:${user._id}`);
    if (storedRefreshHash) {
      await this._deleteRefreshTokenKeys(redis, user._id, storedRefreshHash);
    }

    // Clear any lockout on successful password reset
    await this._clearFailedLogins(normalizedEmail);

    logger.info('Password reset successful', { userId: user._id });
    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  // ── Private Methods ──

  /**
   * Generate JWT access token (RS256, 15min)
   */
  _generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user._id,
        email: user.email,
        role: user.role,
      },
      config.jwt.secret,
      {
        algorithm: 'HS256',
        expiresIn: config.jwt.accessExpires,
        issuer: 'ptm-api',
      }
    );
  }

  /**
   * Generate refresh token (UUID v4, stored hashed in Redis, 7d TTL)
   */
  async _generateRefreshToken(user) {
    const redis = getRedis();
    const refreshToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Clean up any existing refresh token keys for this user
    const oldHash = await redis.get(`auth:refresh:${user._id}`);
    if (oldHash) {
      await redis.del(`auth:refresh_lookup:${oldHash}`);
    }

    // Store both forward (userId→hash) and reverse (hash→userId) keys with 7-day TTL
    const ttlSeconds = 7 * 24 * 60 * 60;
    const pipeline = redis.pipeline();
    pipeline.set(`auth:refresh:${user._id}`, tokenHash, 'EX', ttlSeconds);
    pipeline.set(`auth:refresh_lookup:${tokenHash}`, user._id.toString(), 'EX', ttlSeconds);
    await pipeline.exec();

    return refreshToken;
  }

  /**
   * Delete both forward and reverse refresh token keys
   */
  async _deleteRefreshTokenKeys(redis, userId, tokenHash) {
    const pipeline = redis.pipeline();
    pipeline.del(`auth:refresh:${userId}`);
    pipeline.del(`auth:refresh_lookup:${tokenHash}`);
    await pipeline.exec();
  }

  /**
   * Generate both access and refresh tokens
   */
  async _generateTokens(user) {
    const accessToken = this._generateAccessToken(user);
    const refreshToken = await this._generateRefreshToken(user);
    return { accessToken, refreshToken };
  }

  /**
   * Generate 6-digit OTP using CSPRNG and store in MongoDB (10min TTL)
   */
  async _generateOTP(email) {
    const code = generateSecureOTP();

    await OTP.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, attempts: 0, created_at: new Date() },
      { upsert: true, new: true }
    );

    // In development: log OTP at debug level only (won't appear in prod info-level logs)
    // In production: send via SendGrid (TODO)
    logger.debug('OTP generated for password reset', { email: email.toLowerCase() });

    return code;
  }

  // ── Account Lockout ──

  /**
   * Check if account is locked due to too many failed login attempts
   */
  async _checkAccountLockout(email) {
    const redis = getRedis();
    const lockoutKey = `auth:lockout:${email}`;
    const isLocked = await redis.get(lockoutKey);

    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      const minutesLeft = Math.ceil(ttl / 60);
      logger.warn('Login attempt on locked account', { email });
      throw new AppError(
        errorCodes.AUTH_ACCOUNT_LOCKED,
        `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
        429
      );
    }
  }

  /**
   * Record a failed login attempt. Lock account after MAX_LOGIN_ATTEMPTS.
   */
  async _recordFailedLogin(email, userId = null) {
    const redis = getRedis();
    const attemptsKey = `auth:failed_attempts:${email}`;

    const attempts = await redis.incr(attemptsKey);
    // Set TTL on first attempt (window resets after 15 minutes of no attempts)
    if (attempts === 1) {
      await redis.expire(attemptsKey, LOCKOUT_DURATION_SECONDS);
    }

    logger.warn('Failed login attempt', {
      email,
      userId: userId?.toString() || 'unknown',
      attemptNumber: attempts,
    });

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      // Lock the account
      await redis.set(`auth:lockout:${email}`, '1', 'EX', LOCKOUT_DURATION_SECONDS);
      await redis.del(attemptsKey); // Reset counter
      logger.warn('Account locked due to failed attempts', { email, attempts });
    }
  }

  /**
   * Clear failed login attempts (after successful login or password reset)
   */
  async _clearFailedLogins(email) {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.del(`auth:failed_attempts:${email}`);
    pipeline.del(`auth:lockout:${email}`);
    await pipeline.exec();
  }
}

module.exports = new AuthService();
