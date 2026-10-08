import rateLimit from 'express-rate-limit';

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: message || 'Too many requests, please try again later.',
        },
      });
    },
  });

/**
 * Rate limiter for authentication routes: 10 requests per 15 minutes per IP.
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again in 15 minutes.',
});

/**
 * Global rate limiter: 300 requests per 15 minutes per IP.
 */
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests from this IP, please try again later.',
});

/**
 * Assistant rate limiter: 20 requests per minute per user.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
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
  authLimiter,
  globalLimiter,
  aiLimiter,
};

