import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { skillsQuerySchema } from '../validators/catalog.validator.js';
import { slugParamSchema } from '../validators/common.validator.js';
import * as catalogController from '../controllers/catalog.controller.js';

export const skillsRouter = Router();

// GET /api/skills (student/admin, catalog read)
skillsRouter.get(
  '/',
  optionalAuth,
  validate(skillsQuerySchema, 'query'),
  catalogController.listSkills,
);

// GET /api/skills/:slug (student/admin, includes you block)
skillsRouter.get(
  '/:slug',
  optionalAuth,
  validate(slugParamSchema, 'params'),
  catalogController.getSkillDetail,
);

export const careersRouter = Router();

// GET /api/careers (student/admin)
careersRouter.get('/', optionalAuth, catalogController.listCareers);

// GET /api/careers/:slug (student/admin)
careersRouter.get(
  '/:slug',
  optionalAuth,
  validate(slugParamSchema, 'params'),
  catalogController.getCareerDetail,
);

export default {
  skillsRouter,
  careersRouter,
};
