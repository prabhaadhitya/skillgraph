import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { mongoSanitizer } from './middleware/sanitize.js';
import { apiRouter } from './routes/index.js';

export const app = express();

// Disable X-Powered-By header
app.disable('x-powered-by');

// Security headers
app.use(helmet());

// CORS configuration matching CLIENT_ORIGIN
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

// Body parsing with 100kb limit
app.use(express.json({ limit: '100kb' }));

// Reject any request body, query, or params containing MongoDB operators ($ prefix)
app.use(mongoSanitizer);

// Cookie parsing for sg_token
app.use(cookieParser());

// HTTP request logging via morgan streaming into logger.info
app.use(
  morgan(':method :url :status :response-time ms', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
    skip: () => env.NODE_ENV === 'test',
  }),
);

// Global rate limiter
app.use(globalLimiter);

// Mount API routes
app.use('/api', apiRouter);

// 404 handler for unknown routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

export default app;
