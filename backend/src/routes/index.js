import { Router } from 'express';
import { respond } from '../utils/respond.js';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';
import { skillsRouter, careersRouter } from './catalog.routes.js';
import { getMeta } from '../controllers/meta.controller.js';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  respond.ok(res, { status: 'ok' });
});

// Public metadata endpoint
apiRouter.get('/meta', getMeta);

// Auth router
apiRouter.use('/auth', authRouter);

// User profile router
apiRouter.use('/users', userRouter);

// Catalog routers
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/careers', careersRouter);

export default apiRouter;
