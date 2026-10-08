import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nextSkillsQuerySchema } from '../validators/recommendation.validator.js';
import * as recommendationController from '../controllers/recommendation.controller.js';

export const recommendationRouter = Router();

// Recommendations require authentication
recommendationRouter.use(auth);

// GET /api/recommendations/next-skills?career=&limit=3&strategy=auto
recommendationRouter.get(
  '/next-skills',
  validate(nextSkillsQuerySchema, 'query'),
  recommendationController.getNextSkills,
);

export default recommendationRouter;
