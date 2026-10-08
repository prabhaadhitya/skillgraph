import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import * as userSkillsService from '../services/userSkills.service.js';

/**
 * Get current student skills.
 * GET /api/users/me/skills
 */
export const getSkills = asyncHandler(async (req, res) => {
  const data = await userSkillsService.getSkills(req.user.id);
  respond.ok(res, data);
});

/**
 * Replace entire skill profile.
 * PUT /api/users/me/skills
 */
export const putSkills = asyncHandler(async (req, res) => {
  const data = await userSkillsService.putSkills(req.user.id, req.validated.body.skills);
  respond.ok(res, data);
});

/**
 * Update proficiency of a single skill.
 * PATCH /api/users/me/skills/:skillSlug
 */
export const patchSkill = asyncHandler(async (req, res) => {
  const data = await userSkillsService.patchSkill(
    req.user.id,
    req.validated.params.skillSlug,
    req.validated.body.proficiency,
  );
  respond.ok(res, data);
});

/**
 * Get student progress and alignment history.
 * GET /api/users/me/progress
 */
export const getProgress = asyncHandler(async (req, res) => {
  const data = await userSkillsService.getProgress(req.user.id);
  respond.ok(res, data);
});

export default {
  getSkills,
  putSkills,
  patchSkill,
  getProgress,
};
