import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  putSkillsSchema,
  patchSkillSchema,
  skillParamSchema,
} from '../validators/userSkills.validator.js';
import * as userSkillsController from '../controllers/userSkills.controller.js';

export const userSkillsRouter = Router();

// All user skills and progress routes require student authentication
userSkillsRouter.use(auth);

// GET /api/users/me/skills — docs/API.md §4
userSkillsRouter.get('/me/skills', userSkillsController.getSkills);

// PUT /api/users/me/skills — docs/API.md §4
userSkillsRouter.put(
  '/me/skills',
  validate(putSkillsSchema, 'body'),
  userSkillsController.putSkills,
);

// PATCH /api/users/me/skills/:skillSlug — docs/API.md §4
userSkillsRouter.patch(
  '/me/skills/:skillSlug',
  validate(skillParamSchema, 'params'),
  validate(patchSkillSchema, 'body'),
  userSkillsController.patchSkill,
);

// GET /api/users/me/progress — docs/API.md §4
userSkillsRouter.get('/me/progress', userSkillsController.getProgress);

export default userSkillsRouter;
