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

export default {
  authLimiter,
  globalLimiter,
};
