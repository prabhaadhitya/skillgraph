import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Structured HTTP request logging middleware.
 * Logs method, path, status, and duration ms.
 * Strictly NEVER logs bodies, cookies, or headers.
 */
export function requestLogger(req, res, next) {
  if (env.NODE_ENV === 'test') {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
    });
  });

  next();
}

export default requestLogger;
