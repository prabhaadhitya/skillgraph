import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import {
  postSkillSchema,
  patchSkillSchema,
  skillParamSchema,
  postRelationshipSchema,
  relationshipQuerySchema,
  relationshipIdParamSchema,
  postCareerSchema,
  patchCareerSchema,
  careerParamSchema,
  putCareerSkillsSchema,
} from '../validators/admin.validator.js';
import * as adminController from '../controllers/admin.controller.js';
import { adminAnalyticsRouter } from './analytics.routes.js';

export const adminRouter = Router();

// Protect all admin endpoints
adminRouter.use(auth);
adminRouter.use(requireRole('admin'));

// Admin aggregate analytics — docs/API.md §8
adminRouter.use('/analytics', adminAnalyticsRouter);

// Skills management — docs/API.md §9
adminRouter.post('/skills', validate(postSkillSchema, 'body'), adminController.createSkill);
adminRouter.patch(
  '/skills/:slug',
  validate(skillParamSchema, 'params'),
  validate(patchSkillSchema, 'body'),
  adminController.updateSkill,
);
adminRouter.delete(
  '/skills/:slug',
  validate(skillParamSchema, 'params'),
  adminController.deleteSkill,
);

// Relationships management — docs/API.md §9
adminRouter.get(
  '/relationships',
  validate(relationshipQuerySchema, 'query'),
  adminController.getRelationships,
);
adminRouter.post(
  '/relationships',
  validate(postRelationshipSchema, 'body'),
  adminController.createRelationship,
);
adminRouter.delete(
  '/relationships/:id',
  validate(relationshipIdParamSchema, 'params'),
  adminController.deleteRelationship,
);

// Careers management — docs/API.md §9
adminRouter.post('/careers', validate(postCareerSchema, 'body'), adminController.createCareer);
adminRouter.patch(
  '/careers/:slug',
  validate(careerParamSchema, 'params'),
  validate(patchCareerSchema, 'body'),
  adminController.updateCareer,
);
adminRouter.put(
  '/careers/:slug/skills',
  validate(careerParamSchema, 'params'),
  validate(putCareerSkillsSchema, 'body'),
  adminController.updateCareerSkills,
);

export default adminRouter;
