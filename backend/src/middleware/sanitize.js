import { ApiError } from '../utils/ApiError.js';

/**
 * Recursively inspects a value (object or array) to detect keys starting with '$'.
 * Used to block MongoDB operator injection attacks (e.g. { "$ne": null }).
 *
 * @param {*} value - The value to inspect
 * @returns {boolean} True if any object key begins with '$'
 */
export function hasMongoOperator(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasMongoOperator(item));
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) {
      return true;
    }
    if (hasMongoOperator(value[key])) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware that rejects any request containing MongoDB query operators ('$' prefix)
 * in req.body, req.query, or req.params.
 */
export function mongoSanitizer(req, res, next) {
  if (hasMongoOperator(req.body) || hasMongoOperator(req.query) || hasMongoOperator(req.params)) {
    return next(
      new ApiError(400, 'VALIDATION_ERROR', 'Prohibited MongoDB operator key starting with "$" detected')
    );
  }
  next();
}

export default mongoSanitizer;
