import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { csrfProtection, isAllowedOrigin } from './middleware/csrf.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { mongoSanitizer } from './middleware/sanitize.js';
import { requestLogger } from './middleware/requestLogger.js';
import { getHealth } from './controllers/health.controller.js';
import { auth } from './middleware/auth.js';
import { requireRole } from './middleware/requireRole.js';
import { getMlInfo } from './controllers/admin.controller.js';
import { apiRouter } from './routes/index.js';

export const app = express();

// Disable X-Powered-By header
app.disable('x-powered-by');

// Security headers
app.use(helmet());

// CORS configuration supporting multi-origin, credentialed cross-site cookies, and CSRF headers
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin, env.CLIENT_ORIGIN)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'x-csrf-token',
      'x-qa-bypass-rate-limit',
    ],
    exposedHeaders: ['Set-Cookie', 'X-CSRF-Token', 'x-csrf-token'],
    maxAge: 86400,
  }),
);

// Body parsing with 100kb limit
app.use(express.json({ limit: '100kb' }));

// Reject any request body, query, or params containing MongoDB operators ($ prefix)
app.use(mongoSanitizer);

// Cookie parsing for sg_token and sg_csrf
app.use(cookieParser());

// CSRF protection for cookie-based sessions
app.use(csrfProtection);

// Structured HTTP request logging: method, path, status, duration ms (never bodies/cookies/headers)
app.use(requestLogger);

// Global rate limiter
app.use(globalLimiter);

// Public root health check endpoint: reports db and cached ml status
app.get('/health', getHealth);

// Admin ML model info root route — docs/API.md §8 & §12
app.get('/admin/ml/info', auth, requireRole('admin'), getMlInfo);

// Mount API routes
app.use('/api', apiRouter);

// 404 handler for unknown routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

export default app;
