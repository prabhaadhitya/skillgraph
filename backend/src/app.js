import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { respond } from './utils/respond.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  respond.ok(res, { status: 'ok' });
});

// 404 handler for unknown routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

export default app;
