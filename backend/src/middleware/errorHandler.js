const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');
const errorCodes = require('../utils/errorCodes');
const config = require('../config/env');

/**
 * Custom AppError class for operational errors
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Central error handler middleware
 * Must be registered LAST in the Express middleware chain.
 */
const errorHandler = (err, req, res, next) => {
  // Already sent response
  if (res.headersSent) {
    return next(err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return apiResponse.error(
      res,
      errorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      details
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return apiResponse.error(
      res,
      errorCodes.VALIDATION_ERROR,
      `Duplicate value for ${field}`,
      409
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return apiResponse.error(
      res,
      errorCodes.VALIDATION_ERROR,
      `Invalid ${err.path}: ${err.value}`,
      400
    );
  }

  // JWT errors (caught here as fallback)
  if (err.name === 'JsonWebTokenError') {
    return apiResponse.error(res, errorCodes.AUTH_TOKEN_INVALID, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return apiResponse.error(res, errorCodes.AUTH_TOKEN_EXPIRED, 'Token expired', 401);
  }

  // Operational errors (our AppError)
  if (err.isOperational) {
    return apiResponse.error(
      res,
      err.code,
      err.message,
      err.statusCode,
      err.details
    );
  }

  // Unexpected/programming errors — log full stack, send generic message
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const message =
    config.env === 'development'
      ? err.message
      : 'An unexpected error occurred';

  return apiResponse.error(
    res,
    errorCodes.INTERNAL_ERROR,
    message,
    500
  );
};

/**
 * 404 handler — must be registered after all routes
 */
const notFoundHandler = (req, res) => {
  return apiResponse.error(
    res,
    errorCodes.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );
};

module.exports = { AppError, errorHandler, notFoundHandler };
