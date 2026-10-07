import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import * as userService from '../services/user.service.js';

/**
 * Get current user profile.
 * GET /api/users/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  respond.ok(res, { user });
});

/**
 * Update current user profile.
 * PATCH /api/users/me
 */
export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.validated.body);
  respond.ok(res, { user });
});

export default {
  getMe,
  updateMe,
};
