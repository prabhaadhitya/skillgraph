import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import * as analyticsService from '../services/analytics.service.js';

/**
 * GET /analysis/insights (student, own data only)
 */
export const getStudentInsights = asyncHandler(async (req, res) => {
  const { data, meta } = await analyticsService.getStudentInsights(req.user.id);
  return respond.ok(res, data, meta);
});

/**
 * GET /admin/analytics/overview
 */
export const getOverview = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminOverview();
  return respond.ok(res, data);
});

/**
 * GET /admin/analytics/skill-gaps
 */
export const getSkillGaps = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const data = await analyticsService.getAdminSkillGaps(limit);
  return respond.ok(res, data);
});

/**
 * GET /admin/analytics/career-distribution
 */
export const getCareerDistribution = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminCareerDistribution();
  return respond.ok(res, data);
});

/**
 * GET /admin/analytics/skill-popularity
 */
export const getSkillPopularity = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const data = await analyticsService.getAdminSkillPopularity(limit);
  return respond.ok(res, data);
});

/**
 * GET /admin/analytics/semester-distribution
 */
export const getSemesterDistribution = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminSemesterDistribution();
  return respond.ok(res, data);
});
