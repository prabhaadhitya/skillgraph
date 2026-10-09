import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { warmCareerModels } from './services/careerModel.service.js';

async function startServer() {
  try {
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
