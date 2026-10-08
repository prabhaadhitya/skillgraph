import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  careerQuerySchema,
  graphQuerySchema,
  whatIfBodySchema,
  careerCompareQuerySchema,
} from '../validators/analysis.validator.js';
import * as analysisController from '../controllers/analysis.controller.js';

export const analysisRouter = Router();

// All analysis routes require authentication
analysisRouter.use(auth);

analysisRouter.get(
  '/skill-gap',
  validate(careerQuerySchema, 'query'),
  analysisController.getSkillGap,
);

analysisRouter.get(
  '/career-fit',
  validate(careerQuerySchema, 'query'),
  analysisController.getCareerFit,
);

analysisRouter.get(
  '/learning-path',
  validate(careerQuerySchema, 'query'),
  analysisController.getLearningPath,
);

analysisRouter.get(
  '/graph',
  validate(graphQuerySchema, 'query'),
  analysisController.getGraph,
);

analysisRouter.get(
  '/dashboard',
  validate(careerQuerySchema, 'query'),
  analysisController.getDashboard,
);

analysisRouter.post(
  '/what-if',
  validate(whatIfBodySchema, 'body'),
  analysisController.postWhatIf,
);

analysisRouter.get(
  '/career-compare',
  validate(careerCompareQuerySchema, 'query'),
  analysisController.getCareerCompare,
);

export default analysisRouter;
