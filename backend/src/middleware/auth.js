const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');
const errorCodes = require('../utils/errorCodes');
const User = require('../modules/auth/auth.model').User;

/**
 * Verify JWT access token (RS256)
 * Required for all protected routes.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse.error(
        res,
        errorCodes.AUTH_UNAUTHORIZED,
        'Access token required',
        401
      );
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.publicKey, {
      algorithms: ['RS256'],
    });

    // Check if user still exists and is active
    const user = await User.findById(decoded.sub).select('-password_hash');
    if (!user) {
      return apiResponse.error(
        res,
        errorCodes.USER_NOT_FOUND,
        'User no longer exists',
        401
      );
    }

    if (!user.is_active) {
      return apiResponse.error(
        res,
        errorCodes.AUTH_ACCOUNT_SUSPENDED,
        'Account has been suspended',
        403
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return apiResponse.error(
        res,
        errorCodes.AUTH_TOKEN_EXPIRED,
        'Access token expired',
        401
      );
    }
    if (error.name === 'JsonWebTokenError') {
      return apiResponse.error(
        res,
        errorCodes.AUTH_TOKEN_INVALID,
        'Invalid access token',
        401
      );
    }
    logger.error('Auth middleware error', { error: error.message });
    return apiResponse.error(
      res,
      errorCodes.INTERNAL_ERROR,
      'Authentication failed',
      500
    );
  }
};

/**
 * Optional authentication — populates req.user if token exists
 * Used for public routes that benefit from user context (e.g. AI recommendations)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.publicKey, {
      algorithms: ['RS256'],
    });

    const user = await User.findById(decoded.sub).select('-password_hash');
    req.user = user && user.is_active ? user : null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { authenticateToken, optionalAuth };
