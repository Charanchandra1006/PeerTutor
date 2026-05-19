const { ZodError } = require('zod');
const apiResponse = require('../utils/apiResponse');
const errorCodes = require('../utils/errorCodes');

/**
 * Zod validation middleware factory.
 * Validates request body, params, and/or query against Zod schemas.
 *
 * Usage:
 *   validate({ body: loginSchema })
 *   validate({ body: createSchema, params: idParamSchema })
 *   validate({ query: paginationSchema })
 *
 * @param {object} schemas - Object with optional body, params, query Zod schemas
 */
const validate = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'body'));
      } else {
        req.body = result.data; // Use parsed & transformed data
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'params'));
      } else {
        req.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'query'));
      } else {
        req.query = result.data;
      }
    }

    if (errors.length > 0) {
      return apiResponse.error(
        res,
        errorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        errors
      );
    }

    next();
  };
};

/**
 * Format Zod errors into field-level error objects
 * @param {ZodError} zodError
 * @param {string} location - 'body', 'params', or 'query'
 */
function formatZodErrors(zodError, location) {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    location,
  }));
}

module.exports = { validate };
