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
