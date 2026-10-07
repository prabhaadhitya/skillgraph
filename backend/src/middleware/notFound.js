import { ApiError } from '../utils/ApiError.js';

/**
 * 404 handler for routes that do not match.
 */
export const notFound = (req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
};

export default notFound;
