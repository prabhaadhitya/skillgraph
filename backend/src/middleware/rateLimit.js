import rateLimit from 'express-rate-limit';

export const createLimiter = ({ windowMs, limit, message, skip, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    ...(skip ? { skip } : {}),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: typeof message === 'function' ? message(req, res) : (message || 'Too many requests, please try again later.'),
        },
      });
    },
  });

/**
 * Checks if the request is permitted to bypass rate limiting.
 * Strictly permitted ONLY when NODE_ENV === 'test' and the bypass header is 'true'.
 * External clients in production or development can NEVER bypass rate limits.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function canBypassRateLimit(req) {
  if (process.env.NODE_ENV !== 'test') {
    return false;
  }
  const header = req?.headers?.['x-qa-bypass-rate-limit'];
  return typeof header === 'string' && header.trim().toLowerCase() === 'true';
}

/**
 * Rate limiter for authentication routes: 10 requests per 15 minutes per IP.
 * Configurable via AUTH_RATE_LIMIT_MAX (e.g. in test suites).
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: () => (process.env.AUTH_RATE_LIMIT_MAX ? Number(process.env.AUTH_RATE_LIMIT_MAX) : 10),
  message: 'Too many authentication attempts, please try again in 15 minutes.',
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') {
      if (canBypassRateLimit(req)) {
        return true;
      }
      return !process.env.AUTH_RATE_LIMIT_MAX;
    }
    return false;
  },
});

/**
 * Global rate limiter: 300 requests per 15 minutes per IP.
 * Configurable via GLOBAL_RATE_LIMIT_MAX (e.g. in test suites).
 */
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: () => (process.env.GLOBAL_RATE_LIMIT_MAX ? Number(process.env.GLOBAL_RATE_LIMIT_MAX) : 300),
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') {
      if (canBypassRateLimit(req)) {
        return true;
      }
      return !process.env.GLOBAL_RATE_LIMIT_MAX;
    }
    return false;
  },
});

/**
 * Assistant rate limiter: 20 requests per minute per user.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a minute and try again.',
      },
    });
  },
});

export default {
  createLimiter,
  canBypassRateLimit,
  authLimiter,
  globalLimiter,
  aiLimiter,
};
