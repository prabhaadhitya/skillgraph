import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { COOKIE_NAME } from '../utils/authCookie.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Authentication middleware.
 * Reads token from cookie (or optional Authorization header for API tools),
 * verifies JWT, loads the active user from the database, and sets req.user.
 */
export const auth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid or expired token');
  }

  const user = await User.findById(decoded.sub).populate('targetCareerId');
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
    targetCareerId: user.targetCareerId,
  };
  req.userDoc = user;

  next();
});

/**
 * Optional authentication middleware.
 * If valid cookie or bearer token exists, attaches user to req.user.
 * Otherwise leaves req.user = null without throwing 401.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.sub).populate('targetCareerId');
    if (user) {
      req.user = {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
        targetCareerId: user.targetCareerId,
      };
      req.userDoc = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
});

export default auth;
