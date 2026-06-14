const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validator');
const { authenticateToken } = require('../../middleware/auth');
const { authLimiter, refreshTokenLimiter } = require('../../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');

// ── Public Routes (strict rate limit: 5 req/min) ──
router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  authController.login
);

// Refresh uses a separate, higher limit (30 req/min) so automatic
// token refresh doesn't compete with login rate limits
router.post(
  '/refresh',
  refreshTokenLimiter,
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

// ── Google OAuth Routes ──
const passport = require('./passport');
const config = require('../../config/env');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('../../config/redis');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      const user = req.user;
      // Generate JWT tokens
      const accessToken = jwt.sign(
        { sub: user._id, email: user.email, role: user.role },
        config.jwt.secret,
        { algorithm: 'HS256', expiresIn: config.jwt.accessExpires, issuer: 'ptm-api' }
      );

      const refreshToken = uuidv4();
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const redis = getRedis();
      const ttlSeconds = 7 * 24 * 60 * 60;
      const pipeline = redis.pipeline();
      pipeline.set(`auth:refresh:${user._id}`, tokenHash, 'EX', ttlSeconds);
      pipeline.set(`auth:refresh_lookup:${tokenHash}`, user._id.toString(), 'EX', ttlSeconds);
      await pipeline.exec();

      // Redirect to frontend with tokens
      const frontendUrl = config.frontendUrl;
      res.redirect(`${frontendUrl}/login?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}`);
    } catch (err) {
      res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }
  }
);

// ── Protected Routes ──
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getMe);
router.patch(
  '/password',
  authenticateToken,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

module.exports = router;
