/**
 * Wraps asynchronous Express route handlers and catches rejected promises to pass to next().
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
