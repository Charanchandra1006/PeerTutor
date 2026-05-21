const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const apiResponse = require('../utils/apiResponse');
const errorCodes = require('../utils/errorCodes');

const createLimiterHandler = (message) => (req, res) => {
  return apiResponse.error(
    res,
    errorCodes.RATE_LIMIT_EXCEEDED,
    message,
    429
  );
};

/**
 * Public route limiter: 100 req/min per IP
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.public,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimiterHandler('Too many requests. Please try again later.'),
  keyGenerator: (req) => req.ip,
});

/**
 * Authenticated route limiter: 1000 req/min per user
 */
const authenticatedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.authenticated,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimiterHandler('Rate limit exceeded for authenticated user.'),
  keyGenerator: (req) => req.user?.id || req.ip,
});

/**
 * Auth endpoint limiter: 5 req/min per IP (login, register, forgot-password)
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.authEndpoints,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimiterHandler('Too many authentication attempts. Please wait before trying again.'),
  keyGenerator: (req) => req.ip,
});

/**
 * Refresh token limiter: 30 req/min per IP
 * Separated from authLimiter so automatic token refreshes don't
 * burn through the strict 5 req/min login limit.
 */
const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimiterHandler('Too many token refresh attempts.'),
  keyGenerator: (req) => req.ip,
});

module.exports = { publicLimiter, authenticatedLimiter, authLimiter, refreshTokenLimiter };
