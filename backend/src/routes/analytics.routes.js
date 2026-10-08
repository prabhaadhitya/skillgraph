import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as analyticsController from '../controllers/analytics.controller.js';

/**
 * Student insights router (mounted at /analysis/insights)
 * Requires student authentication.
 */
export const insightsRouter = Router();
insightsRouter.use(auth);
insightsRouter.get('/', analyticsController.getStudentInsights);

/**
 * Admin analytics router (mounted at /admin/analytics)
 * Requires admin authentication.
 */
export const adminAnalyticsRouter = Router();
adminAnalyticsRouter.use(auth);
adminAnalyticsRouter.use(requireRole('admin'));

adminAnalyticsRouter.get('/overview', analyticsController.getOverview);
adminAnalyticsRouter.get('/skill-gaps', analyticsController.getSkillGaps);
adminAnalyticsRouter.get('/career-distribution', analyticsController.getCareerDistribution);
adminAnalyticsRouter.get('/skill-popularity', analyticsController.getSkillPopularity);
adminAnalyticsRouter.get('/semester-distribution', analyticsController.getSemesterDistribution);

export default {
  insightsRouter,
  adminAnalyticsRouter,
};
