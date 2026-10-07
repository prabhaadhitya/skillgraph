import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';
import defaultSettingsController from '../controllers/settings.controller.js';

/**
 * AI rate limiter preset: 20 requests per minute per user.
 */
export const aiTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many AI requests, please try again in a minute.',
      },
    });
  },
});

/**
 * Creates settings router with injectable controller for testing.
 *
 * @param {Object} [controller=defaultSettingsController]
 * @returns {import('express').Router}
 */
export function createSettingsRouter(controller = defaultSettingsController) {
  const router = Router();

  // All settings routes require authentication
  router.use(auth);

  router.get('/', controller.getLlmSettings);
  router.put('/', validate(updateSettingsSchema, 'body'), controller.updateLlmSettings);
  router.delete('/key', controller.removeLlmKey);
  router.post('/test', aiTestLimiter, controller.testLlmKey);
  router.get('/suggested-models', controller.getSuggestedModels);

  return router;
}

export const settingsRouter = createSettingsRouter(defaultSettingsController);
export default settingsRouter;
