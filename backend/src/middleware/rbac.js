const apiResponse = require('../utils/apiResponse');
const errorCodes = require('../utils/errorCodes');

/**
 * Role-Based Access Control (RBAC) middleware
 * Usage: requireRole('admin') or requireRole('tutor', 'both')
 * Must be used AFTER authenticateToken middleware.
 *
 * @param  {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse.error(
        res,
        errorCodes.AUTH_UNAUTHORIZED,
        'Authentication required',
        401
      );
    }

    if (!roles.includes(req.user.role)) {
      return apiResponse.error(
        res,
        errorCodes.AUTH_FORBIDDEN,
        `Access denied. Required roles: ${roles.join(', ')}`,
        403
      );
    }

    next();
  };
};

/**
 * Check if user can act as a tutor (role is 'tutor' or 'both')
 */
const requireTutor = (req, res, next) => {
  if (!req.user) {
    return apiResponse.error(res, errorCodes.AUTH_UNAUTHORIZED, 'Authentication required', 401);
  }
  if (!['tutor', 'both'].includes(req.user.role)) {
    return apiResponse.error(res, errorCodes.AUTH_FORBIDDEN, 'Tutor access required', 403);
  }
  next();
};

/**
 * Check if user can act as a student (role is 'student' or 'both')
 */
const requireStudent = (req, res, next) => {
  if (!req.user) {
    return apiResponse.error(res, errorCodes.AUTH_UNAUTHORIZED, 'Authentication required', 401);
  }
  if (!['student', 'both'].includes(req.user.role)) {
    return apiResponse.error(res, errorCodes.AUTH_FORBIDDEN, 'Student access required', 403);
  }
  next();
};

module.exports = { requireRole, requireTutor, requireStudent };
