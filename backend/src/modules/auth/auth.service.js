const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { User, OTP } = require('./auth.model');
const config = require('../../config/env');
const { getRedis } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Register a new user
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

    // Create user with hashed password
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash: password, // Pre-save hook handles bcrypt hashing
      name,
      role,
    });

    // Generate and store OTP
    const otp = await this._generateOTP(email);

    logger.info('User registered', { userId: user._id, email: user.email });

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_email_verified: user.is_email_verified,
      },
      otp, // In production, don't return OTP — send via email only
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP({ email, otp }) {
    const otpRecord = await OTP.findOne({ email: email.toLowerCase() });

    if (!otpRecord) {
      throw new AppError(errorCodes.AUTH_OTP_EXPIRED, 'OTP has expired. Please request a new one.', 400);
    }

    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ email: email.toLowerCase() });
      throw new AppError(errorCodes.AUTH_OTP_MAX_ATTEMPTS, 'Maximum OTP attempts exceeded. Please request a new code.', 400);
    }

    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 3 - otpRecord.attempts;
      throw new AppError(errorCodes.AUTH_OTP_INVALID, `Incorrect OTP code. ${remaining} attempts remaining.`, 400);
    }

    // Mark email as verified
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { is_email_verified: true },
      { new: true }
    );

    // Remove used OTP
    await OTP.deleteOne({ email: email.toLowerCase() });

    // Generate tokens
    const tokens = await this._generateTokens(user);

    logger.info('Email verified via OTP', { userId: user._id });

    return { user, ...tokens };
  }

  /**
   * Login with email and password
   */
  async login({ email, password }) {
    // Find user with password field included
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password_hash');

    if (!user) {
      throw new AppError(errorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError(errorCodes.AUTH_ACCOUNT_SUSPENDED, 'Account has been suspended', 403);
    }

    if (!user.is_email_verified) {
      // Re-send OTP
      const otp = await this._generateOTP(email);
      throw new AppError(
        errorCodes.AUTH_EMAIL_NOT_VERIFIED,
        'Email not verified. A new OTP has been sent.',
        403
      );
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError(errorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

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

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find which user this refresh token belongs to
    const keys = await redis.keys('auth:refresh:*');

    let userId = null;
    for (const key of keys) {
      const storedHash = await redis.get(key);
      if (storedHash === tokenHash) {
        userId = key.split(':')[2]; // auth:refresh:{userId}
        break;
      }
    }

    if (!userId) {
      throw new AppError(errorCodes.AUTH_REFRESH_TOKEN_INVALID, 'Invalid or expired refresh token', 401);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user || !user.is_active) {
      await redis.del(`auth:refresh:${userId}`);
      throw new AppError(errorCodes.AUTH_REFRESH_TOKEN_INVALID, 'User not found or suspended', 401);
    }

    // Rotate: delete old refresh token, generate new pair
    await redis.del(`auth:refresh:${userId}`);

    const tokens = await this._generateTokens(user);

    logger.info('Token refreshed', { userId: user._id });

    return tokens;
  }

  /**
   * Logout — invalidate refresh token
   */
  async logout(userId) {
    const redis = getRedis();
    await redis.del(`auth:refresh:${userId}`);
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
    await redis.del(`auth:refresh:${userId}`);

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
   * Resend OTP
   */
  async resendOTP(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'No account with this email', 404);
    }
    if (user.is_email_verified) {
      throw new AppError(errorCodes.AUTH_EMAIL_NOT_VERIFIED, 'Email is already verified', 400);
    }

    const otp = await this._generateOTP(email);
    logger.info('OTP resent', { email });
    return { message: 'OTP sent to your email', otp }; // Remove otp in production
  }

  /**
   * Forgot password — send OTP
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If an account exists with this email, an OTP has been sent.' };
    }

    const otp = await this._generateOTP(email);
    logger.info('Forgot password OTP sent', { email });
    return { message: 'If an account exists with this email, an OTP has been sent.', otp };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword({ email, otp, newPassword }) {
    // Verify OTP first
    const otpRecord = await OTP.findOne({ email: email.toLowerCase() });

    if (!otpRecord) {
      throw new AppError(errorCodes.AUTH_OTP_EXPIRED, 'OTP has expired', 400);
    }

    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ email: email.toLowerCase() });
      throw new AppError(errorCodes.AUTH_OTP_MAX_ATTEMPTS, 'Maximum OTP attempts exceeded', 400);
    }

    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new AppError(errorCodes.AUTH_OTP_INVALID, 'Incorrect OTP code', 400);
    }

    // Update password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password_hash');
    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    user.password_hash = newPassword;
    await user.save();

    // Cleanup
    await OTP.deleteOne({ email: email.toLowerCase() });
    const redis = getRedis();
    await redis.del(`auth:refresh:${user._id}`);

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
      config.jwt.privateKey,
      {
        algorithm: 'RS256',
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

    // Store hash in Redis with 7-day TTL
    const ttlSeconds = 7 * 24 * 60 * 60;
    await redis.set(`auth:refresh:${user._id}`, tokenHash, 'EX', ttlSeconds);

    return refreshToken;
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
   * Generate 6-digit OTP and store in MongoDB (10min TTL)
   */
  async _generateOTP(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, attempts: 0, created_at: new Date() },
      { upsert: true, new: true }
    );

    // TODO: Send OTP via SendGrid in production
    logger.info('OTP generated', { email, otp: code }); // Remove otp from logs in production

    return code;
  }
}

module.exports = new AuthService();
