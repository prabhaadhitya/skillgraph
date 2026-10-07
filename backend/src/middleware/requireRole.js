import { ApiError } from '../utils/ApiError.js';

/**
 * Role-based authorization middleware.
 * Ensures req.user has the specified role(s).
 * Returns 403 FORBIDDEN if the user role does not match.
 *
 * @param {...string} roles - Allowed role(s) (e.g. 'admin')
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Access forbidden: insufficient role permissions'));
  }
  next();
};

export default requireRole;
