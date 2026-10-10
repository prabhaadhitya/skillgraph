import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import { setAuthCookie, clearAuthCookie, generateCsrfToken } from '../utils/authCookie.js';
import * as authService from '../services/auth.service.js';

/**
 * Register a new student account.
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.validated.body);
  const csrfToken = req.csrfToken || generateCsrfToken();
  setAuthCookie(res, token, csrfToken);
  res.setHeader('X-CSRF-Token', csrfToken);
  respond.created(res, { user });
});

/**
 * Login user with credentials.
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.validated.body);
  const csrfToken = req.csrfToken || generateCsrfToken();
  setAuthCookie(res, token, csrfToken);
  res.setHeader('X-CSRF-Token', csrfToken);
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

/**
 * Get a valid CSRF token.
 * GET /api/auth/csrf
 */
export const csrf = asyncHandler(async (req, res) => {
  const csrfToken = req.csrfToken || generateCsrfToken();
  respond.ok(res, { csrfToken });
});

export default {
  register,
  login,
  logout,
  me,
  csrf,
};
