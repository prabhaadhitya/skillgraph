import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { mongoSanitizer } from './middleware/sanitize.js';
import { requestLogger } from './middleware/requestLogger.js';
import { getHealth } from './controllers/health.controller.js';
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

// Structured HTTP request logging: method, path, status, duration ms (never bodies/cookies/headers)
app.use(requestLogger);

// Global rate limiter
app.use(globalLimiter);

// Public root health check endpoint: reports db and cached ml status
app.get('/health', getHealth);

// Mount API routes
app.use('/api', apiRouter);

// 404 handler for unknown routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

export default app;
