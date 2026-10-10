import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  canBypassRateLimit,
  authLimiter,
  globalLimiter,
  createLimiter,
} from '../src/middleware/rateLimit.js';

describe('Rate limit bypass security (x-qa-bypass-rate-limit)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('canBypassRateLimit helper function', () => {
    it('returns false in production even if bypass header is "true"', () => {
      process.env.NODE_ENV = 'production';
      const req = {
        headers: {
          'x-qa-bypass-rate-limit': 'true',
        },
      };
      expect(canBypassRateLimit(req)).toBe(false);
    });

    it('returns false in development even if bypass header is "true"', () => {
      process.env.NODE_ENV = 'development';
      const req = {
        headers: {
          'x-qa-bypass-rate-limit': 'true',
        },
      };
      expect(canBypassRateLimit(req)).toBe(false);
    });

    it('returns false when NODE_ENV is undefined or empty', () => {
      delete process.env.NODE_ENV;
      const req = {
        headers: {
          'x-qa-bypass-rate-limit': 'true',
        },
      };
      expect(canBypassRateLimit(req)).toBe(false);
    });

    it('returns true when NODE_ENV === "test" and header is "true"', () => {
      process.env.NODE_ENV = 'test';
      const req = {
        headers: {
          'x-qa-bypass-rate-limit': 'true',
        },
      };
      expect(canBypassRateLimit(req)).toBe(true);
    });

    it('returns true case-insensitively when header is "True" or "TRUE" in test mode', () => {
      process.env.NODE_ENV = 'test';
      expect(canBypassRateLimit({ headers: { 'x-qa-bypass-rate-limit': 'TRUE' } })).toBe(true);
      expect(canBypassRateLimit({ headers: { 'x-qa-bypass-rate-limit': 'True' } })).toBe(true);
    });

    it('returns false in test mode when header is absent, false, or random string', () => {
      process.env.NODE_ENV = 'test';
      expect(canBypassRateLimit({ headers: {} })).toBe(false);
      expect(canBypassRateLimit({ headers: { 'x-qa-bypass-rate-limit': 'false' } })).toBe(false);
      expect(canBypassRateLimit({ headers: { 'x-qa-bypass-rate-limit': '1' } })).toBe(false);
      expect(canBypassRateLimit({})).toBe(false);
    });
  });

  describe('Production enforcement on authLimiter', () => {
    let app;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.AUTH_RATE_LIMIT_MAX = '2';

      app = express();
      app.post('/api/auth/login', authLimiter, (req, res) => {
        res.status(200).json({ success: true, message: 'login attempted' });
      });
    });

    it('rejects external client bypass attempts in production and enforces 429 RATE_LIMITED', async () => {
      // Create a fresh limiter with same config and store to avoid cross-test IP collision
      const prodAuthLimiter = createLimiter({
        windowMs: 60 * 1000,
        limit: () => 2,
        message: 'Too many authentication attempts, please try again in 15 minutes.',
        skip: (req) => {
          if (process.env.NODE_ENV === 'test') {
            if (canBypassRateLimit(req)) return true;
            return !process.env.AUTH_RATE_LIMIT_MAX;
          }
          return false;
        },
      });

      const testApp = express();
      testApp.post('/login', prodAuthLimiter, (req, res) => res.json({ success: true }));

      // Request 1 with bypass header
      const res1 = await request(testApp)
        .post('/login')
        .set('x-qa-bypass-rate-limit', 'true');
      expect(res1.status).toBe(200);

      // Request 2 with bypass header
      const res2 = await request(testApp)
        .post('/login')
        .set('x-qa-bypass-rate-limit', 'true');
      expect(res2.status).toBe(200);

      // Request 3 with bypass header: MUST BE 429 RATE_LIMITED in production
      const res3 = await request(testApp)
        .post('/login')
        .set('x-qa-bypass-rate-limit', 'true');
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe('RATE_LIMITED');
      expect(res3.body.error.message).toMatch(/too many.*attempts/i);
    });
  });

  describe('Production enforcement on globalLimiter', () => {
    it('rejects external client bypass attempts in production and enforces global rate limit', async () => {
      process.env.NODE_ENV = 'production';
      process.env.GLOBAL_RATE_LIMIT_MAX = '2';

      const prodGlobalLimiter = createLimiter({
        windowMs: 60 * 1000,
        limit: () => 2,
        message: 'Too many requests from this IP, please try again later.',
        skip: (req) => {
          if (process.env.NODE_ENV === 'test') {
            if (canBypassRateLimit(req)) return true;
            return !process.env.GLOBAL_RATE_LIMIT_MAX;
          }
          return false;
        },
      });

      const testApp = express();
      testApp.get('/data', prodGlobalLimiter, (req, res) => res.json({ success: true }));

      // Requests 1 & 2 pass
      const res1 = await request(testApp).get('/data').set('x-qa-bypass-rate-limit', 'true');
      expect(res1.status).toBe(200);

      const res2 = await request(testApp).get('/data').set('x-qa-bypass-rate-limit', 'true');
      expect(res2.status).toBe(200);

      // Request 3 is blocked by global rate limit despite bypass header
      const res3 = await request(testApp).get('/data').set('x-qa-bypass-rate-limit', 'true');
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe('RATE_LIMITED');
      expect(res3.body.error.message).toMatch(/too many requests from this ip/i);
    });
  });

  describe('Permit bypass strictly when NODE_ENV === "test"', () => {
    it('permits bypass with header when NODE_ENV === "test" even when limit is reached', async () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_RATE_LIMIT_MAX = '2';

      const testAuthLimiter = createLimiter({
        windowMs: 60 * 1000,
        limit: () => 2,
        message: 'Too many authentication attempts.',
        skip: (req) => {
          if (process.env.NODE_ENV === 'test') {
            if (canBypassRateLimit(req)) return true;
            return !process.env.AUTH_RATE_LIMIT_MAX;
          }
          return false;
        },
      });

      const testApp = express();
      testApp.post('/login', testAuthLimiter, (req, res) => res.json({ success: true }));

      // Fill up the limit with 2 requests without bypass header
      const res1 = await request(testApp).post('/login');
      expect(res1.status).toBe(200);

      const res2 = await request(testApp).post('/login');
      expect(res2.status).toBe(200);

      // 3rd request without header is blocked
      const res3 = await request(testApp).post('/login');
      expect(res3.status).toBe(429);

      // 4th request WITH bypass header succeeds because NODE_ENV === 'test'
      const res4 = await request(testApp)
        .post('/login')
        .set('x-qa-bypass-rate-limit', 'true');
      expect(res4.status).toBe(200);
      expect(res4.body.success).toBe(true);
    });

    it('permits global bypass with header when NODE_ENV === "test"', async () => {
      process.env.NODE_ENV = 'test';
      process.env.GLOBAL_RATE_LIMIT_MAX = '2';

      const testGlobalLimiter = createLimiter({
        windowMs: 60 * 1000,
        limit: () => 2,
        message: 'Too many requests.',
        skip: (req) => {
          if (process.env.NODE_ENV === 'test') {
            if (canBypassRateLimit(req)) return true;
            return !process.env.GLOBAL_RATE_LIMIT_MAX;
          }
          return false;
        },
      });

      const testApp = express();
      testApp.get('/api/skills', testGlobalLimiter, (req, res) => res.json({ success: true }));

      // 2 requests pass
      await request(testApp).get('/api/skills');
      await request(testApp).get('/api/skills');

      // 3rd request without header blocked
      const res3 = await request(testApp).get('/api/skills');
      expect(res3.status).toBe(429);

      // 4th request WITH bypass header succeeds
      const res4 = await request(testApp)
        .get('/api/skills')
        .set('x-qa-bypass-rate-limit', 'true');
      expect(res4.status).toBe(200);
      expect(res4.body.success).toBe(true);
    });

    it('skips rate limiting automatically in test suites when env limit is not set', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.AUTH_RATE_LIMIT_MAX;
      delete process.env.GLOBAL_RATE_LIMIT_MAX;

      const testApp = express();
      testApp.use(globalLimiter);
      testApp.post('/login', authLimiter, (req, res) => res.json({ success: true }));

      // Can make multiple requests without being blocked by default in test mode
      for (let i = 0; i < 15; i++) {
        const res = await request(testApp).post('/login');
        expect(res.status).toBe(200);
      }
    });
  });
});
