import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie.js';
import * as authService from '../services/auth.service.js';

/**
 * Register a new student account.
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.validated.body);
  setAuthCookie(res, token);
  respond.created(res, { user });
});

/**
 * Login user with credentials.
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.validated.body);
  setAuthCookie(res, token);
  respond.ok(res, { user });
});

/**
 * Logout current user and clear cookie.
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  respond.ok(res, { loggedOut: true });
});

/**
 * Get current authenticated user session.
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const { user } = await authService.getMe(req.user.id);
  respond.ok(res, { user });
});

export default {
  register,
  login,
  logout,
  me,
};
