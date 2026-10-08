import { Router } from 'express';
import { respond } from '../utils/respond.js';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';
import { skillsRouter, careersRouter } from './catalog.routes.js';
import { settingsRouter } from './settings.routes.js';
import { adminRouter } from './admin.routes.js';
import { analysisRouter } from './analysis.routes.js';
import { aiRouter } from './ai.routes.js';
import { recommendationRouter } from './recommendation.routes.js';
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

// Analysis engine router
apiRouter.use('/analysis', analysisRouter);

// Recommendations router
apiRouter.use('/recommendations', recommendationRouter);

// AI assistant router
apiRouter.use('/ai', aiRouter);

// LLM settings router
apiRouter.use('/settings/llm', settingsRouter);

// Admin knowledge base management router
apiRouter.use('/admin', adminRouter);

export default apiRouter;

