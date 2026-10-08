import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Central error handling middleware.
 * Maps ZodError to 400 VALIDATION_ERROR with details.
 * Maps Mongo duplicate key 11000 to 409 CONFLICT.
 * Maps ApiError to its status and code.
 * Maps any other error to 500 INTERNAL_ERROR.
 * Never leaks stack traces or internal messages in production.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details = undefined;

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err?.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    const keys = Object.keys(err.keyPattern || err.keyValue || {});
    message = keys.length > 0
      ? `A record with that ${keys.join(', ')} already exists`
      : 'Duplicate resource conflict';
  } else if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else {
    logger.error('Unhandled error:', err);
  }

  const isProduction = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

  // Never leak internal messages or details for 500 internal errors in production
  if (isProduction && status === 500) {
    code = 'INTERNAL_ERROR';
    message = 'Internal server error';
    details = undefined;
  }

  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(!isProduction && status === 500 ? { stack: err.stack } : {}),
    },
  };

  return res.status(status).json(response);
};

export default errorHandler;
