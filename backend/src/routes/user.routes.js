import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { patchUserSchema } from '../validators/user.validator.js';
import * as userController from '../controllers/user.controller.js';

export const userRouter = Router();

// GET /api/users/me (auth required)
userRouter.get('/me', auth, userController.getMe);

// PATCH /api/users/me (auth required)
userRouter.patch('/me', auth, validate(patchUserSchema, 'body'), userController.updateMe);

export default userRouter;
