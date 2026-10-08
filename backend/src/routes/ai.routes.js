import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { chatSchema, explainSchema, historyQuerySchema } from '../validators/ai.validator.js';
import * as aiController from '../controllers/ai.controller.js';

export const aiRouter = Router();

// All AI assistant endpoints require authentication
aiRouter.use(auth);

// POST /api/ai/chat
aiRouter.post(
  '/chat',
  aiLimiter,
  validate(chatSchema, 'body'),
  aiController.chat,
);

// POST /api/ai/explain
aiRouter.post(
  '/explain',
  aiLimiter,
  validate(explainSchema, 'body'),
  aiController.explain,
);

// GET /api/ai/history
aiRouter.get(
  '/history',
  validate(historyQuerySchema, 'query'),
  aiController.getHistory,
);

// DELETE /api/ai/history
aiRouter.delete(
  '/history',
  aiController.clearHistory,
);

export default aiRouter;
