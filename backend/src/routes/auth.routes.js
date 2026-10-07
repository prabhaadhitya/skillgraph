import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';

export const authRouter = Router();

// POST /api/auth/register (public, rate-limited)
authRouter.post('/register', authLimiter, validate(registerSchema, 'body'), authController.register);

// POST /api/auth/login (public, rate-limited)
authRouter.post('/login', authLimiter, validate(loginSchema, 'body'), authController.login);

// POST /api/auth/logout (any)
authRouter.post('/logout', authController.logout);

// GET /api/auth/me (authenticated)
authRouter.get('/me', auth, authController.me);

export default authRouter;
