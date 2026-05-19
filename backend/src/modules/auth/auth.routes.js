const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validator');
const { authenticateToken } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');

// All auth endpoints use strict rate limiting (5 req/min)
router.use(authLimiter);

// ── Public Routes ──
router.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  '/verify-otp',
  validate({ body: verifyOtpSchema }),
  authController.verifyOTP
);

router.post(
  '/login',
  validate({ body: loginSchema }),
  authController.login
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);

router.post(
  '/resend-otp',
  validate({ body: resendOtpSchema }),
  authController.resendOTP
);

router.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
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
