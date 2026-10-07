import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import * as catalogService from '../services/catalog.service.js';

/**
 * List skills with pagination and filters.
 * GET /api/skills
 */
export const listSkills = asyncHandler(async (req, res) => {
  const { skills, meta } = await catalogService.listSkills(req.validated.query);
  respond.ok(res, skills, meta);
});

/**
 * Get skill detail with relationships and user progress.
 * GET /api/skills/:slug
 */
export const getSkillDetail = asyncHandler(async (req, res) => {
  const data = await catalogService.getSkillDetail(req.validated.params.slug, req.user);
  respond.ok(res, data);
});

/**
 * List active careers with skill counts.
 * GET /api/careers
 */
export const listCareers = asyncHandler(async (req, res) => {
  const careers = await catalogService.listCareers();
  respond.ok(res, careers);
});

/**
 * Get career detail with required skills.
 * GET /api/careers/:slug
 */
export const getCareerDetail = asyncHandler(async (req, res) => {
  const data = await catalogService.getCareerDetail(req.validated.params.slug);
  respond.ok(res, data);
});

export default {
  listSkills,
  getSkillDetail,
  listCareers,
  getCareerDetail,
};
