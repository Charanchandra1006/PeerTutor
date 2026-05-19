/**
 * Standardized API Response Helpers
 * All responses follow: { success: boolean, data: any, meta?: object, error?: object }
 */

/**
 * Send a success response
 * @param {object} res - Express response
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code
 * @param {object} meta - Pagination meta (page, limit, total)
 */
const success = (res, data = null, statusCode = 200, meta = null) => {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
const created = (res, data = null) => {
  return res.status(201).json({ success: true, data });
};

/**
 * Send a paginated success response
 */
const paginated = (res, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

/**
 * Send an error response
 * @param {object} res - Express response
 * @param {string} code - Error code (snake_case constant)
 * @param {string} message - Human-readable message
 * @param {number} statusCode - HTTP status code
 * @param {any} details - Additional error details
 */
const error = (res, code, message, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error: { code, message },
  };
  if (details) response.error.details = details;
  return res.status(statusCode).json(response);
};

module.exports = { success, created, paginated, error };
