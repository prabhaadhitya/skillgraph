import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import { logger } from '../utils/logger.js';
import * as analysisService from '../services/analysis.service.js';

export const getSkillGap = asyncHandler(async (req, res) => {
  const start = Date.now();
  const career = req.query.career;
  const data = await analysisService.getSkillGapAnalysis(req.user.id, career);
  logger.info(`[Analysis] GET /analysis/skill-gap completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export const getCareerFit = asyncHandler(async (req, res) => {
  const start = Date.now();
  const career = req.query.career;
  const data = await analysisService.getCareerFitAnalysis(req.user.id, career);
  logger.info(`[Analysis] GET /analysis/career-fit completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export const getLearningPath = asyncHandler(async (req, res) => {
  const start = Date.now();
  const career = req.query.career;
  const data = await analysisService.getLearningPathAnalysis(req.user.id, career);
  logger.info(`[Analysis] GET /analysis/learning-path completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export const getGraph = asyncHandler(async (req, res) => {
  const start = Date.now();
  const career = req.query.career;
  const related = req.query.related === 'true' || req.query.includeRelated === 'true';
  const data = await analysisService.getGraphAnalysis(req.user.id, career, { related });
  logger.info(`[Analysis] GET /analysis/graph completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export const getDashboard = asyncHandler(async (req, res) => {
  const start = Date.now();
  const career = req.query.career;
  const data = await analysisService.getDashboardAnalysis(req.user.id, career);
  logger.info(`[Analysis] GET /analysis/dashboard completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export const postWhatIf = asyncHandler(async (req, res) => {
  const start = Date.now();
  const { careerSlug } = req.body;
  const data = await analysisService.computeWhatIfAnalysis(req.user.id, careerSlug);
  logger.info(`[Analysis] POST /analysis/what-if completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export const getCareerCompare = asyncHandler(async (req, res) => {
  const start = Date.now();
  const { a, b } = req.query;
  const data = await analysisService.compareCareersAnalysis(req.user.id, a, b);
  logger.info(`[Analysis] GET /analysis/career-compare completed in ${Date.now() - start}ms`);
  return respond.ok(res, data);
});

export default {
  getSkillGap,
  getCareerFit,
  getLearningPath,
  getGraph,
  getDashboard,
  postWhatIf,
  getCareerCompare,
};
