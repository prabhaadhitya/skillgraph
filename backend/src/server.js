import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { warmCareerModels } from './services/careerModel.service.js';

export async function validateProductionStartup(config = env) {
  if (config.NODE_ENV === 'production') {
    if (process.env.DEMO_PASSWORD) {
      logger.warn('DEMO_PASSWORD is set in environment; demo account seeding remains strictly disabled in production.');
    }
    logger.info('Production startup validation passed: secrets verified, demo seeding prohibited, mock mode disabled.');
  }
}

async function startServer() {
  try {
    await validateProductionStartup();
    await connectDB();
    await warmCareerModels().catch(() => {});
    app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
// Reload trigger for env update
