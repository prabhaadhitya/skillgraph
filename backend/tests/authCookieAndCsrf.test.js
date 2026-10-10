import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getCookieSameSite,
  getCookieOptions,
  setAuthCookie,
  clearAuthCookie,
} from '../src/utils/authCookie.js';
import { csrfProtection, isAllowedOrigin } from '../src/middleware/csrf.js';

describe('Auth Cookie & CSRF Protection Security', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getCookieSameSite() resolution', () => {
    it('defaults to "lax" for local development / same-origin proxy', () => {
      delete process.env.COOKIE_SAME_SITE;
      expect(getCookieSameSite()).toBe('lax');
    });

    it('resolves configured "none" for direct cross-site Vercel to Render requests', () => {
      process.env.COOKIE_SAME_SITE = 'none';
      expect(getCookieSameSite()).toBe('none');
    });

    it('resolves configured "strict"', () => {
      process.env.COOKIE_SAME_SITE = 'strict';
      expect(getCookieSameSite()).toBe('strict');
    });

    it('falls back to "lax" if invalid string is provided', () => {
      process.env.COOKIE_SAME_SITE = 'invalid_samesite';
      expect(getCookieSameSite()).toBe('lax');
    });
  });

  describe('getCookieOptions() SameSite/Secure enforcement', () => {
    it('strictly enforces secure: true whenever SameSite is "none" even in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECURE = 'false';
      const options = getCookieOptions({ sameSite: 'none' });

      expect(options.sameSite).toBe('none');
      expect(options.secure).toBe(true); // Mandatory for SameSite=None
      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/');
    });

    it('sets secure: true in production mode for SameSite=lax', () => {
      process.env.NODE_ENV = 'production';
      const options = getCookieOptions({ sameSite: 'lax' });

      expect(options.sameSite).toBe('lax');
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
    });

    it('supports custom httpOnly override for client-readable CSRF cookies', () => {
      const options = getCookieOptions({ httpOnly: false });
      expect(options.httpOnly).toBe(false);
    });
  });

  describe('setAuthCookie() and clearAuthCookie()', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(cookieParser());

      app.post('/test/login', (req, res) => {
        setAuthCookie(res, 'sample-jwt-token-123', 'sample-csrf-token-abc');
        res.json({ success: true });
      });

      app.post('/test/logout', (req, res) => {
        clearAuthCookie(res);
        res.json({ success: true, loggedOut: true });
      });
    });

    it('sets both auth and client-accessible CSRF cookies on login', async () => {
      const res = await request(app).post('/test/login');
      expect(res.status).toBe(200);

      const setCookies = res.headers['set-cookie'];
      expect(setCookies).toBeDefined();

      const authCookie = setCookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toMatch(/HttpOnly/i);

      const csrfCookie = setCookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).not.toMatch(/HttpOnly/i); // Must be readable by client JS
    });

    it('clears both cookies on logout with matching paths and attributes', async () => {
      const res = await request(app).post('/test/logout');
      expect(res.status).toBe(200);

      const setCookies = res.headers['set-cookie'];
      const authCookie = setCookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
      const csrfCookie = setCookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

      expect(authCookie).toMatch(/Expires=|Max-Age=0/i);
      expect(csrfCookie).toMatch(/Expires=|Max-Age=0/i);
    });
  });

  describe('isAllowedOrigin() matching', () => {
    it('allows identical origin without trailing slash', () => {
      expect(isAllowedOrigin('http://localhost:5173', 'http://localhost:5173')).toBe(true);
    });

    it('normalizes trailing slashes properly', () => {
      expect(isAllowedOrigin('https://skillgraph.vercel.app', 'https://skillgraph.vercel.app/')).toBe(true);
      expect(isAllowedOrigin('https://skillgraph.vercel.app/', 'https://skillgraph.vercel.app')).toBe(true);
    });

    it('supports comma-separated list of allowed origins', () => {
      const origins = 'http://localhost:5173, https://skillgraph.vercel.app, https://custom-domain.com';
      expect(isAllowedOrigin('http://localhost:5173', origins)).toBe(true);
      expect(isAllowedOrigin('https://skillgraph.vercel.app', origins)).toBe(true);
      expect(isAllowedOrigin('https://custom-domain.com', origins)).toBe(true);
      expect(isAllowedOrigin('https://evil-site.com', origins)).toBe(false);
    });

    it('supports wildcard patterns (e.g. Vercel preview deploys)', () => {
      const origins = 'https://*.vercel.app, http://localhost:5173';
      expect(isAllowedOrigin('https://skillgraph-git-main.vercel.app', origins)).toBe(true);
      expect(isAllowedOrigin('https://skillgraph-abc123.vercel.app', origins)).toBe(true);
      expect(isAllowedOrigin('https://evil-phishing.com', origins)).toBe(false);
    });

    it('allows requests without origin (direct curl, health checks, server-to-server)', () => {
      expect(isAllowedOrigin(null, 'https://skillgraph.vercel.app')).toBe(true);
    });
  });

  describe('csrfProtection middleware', () => {
    let app;

    beforeEach(() => {
      process.env.ENFORCE_CSRF = 'true'; // Enforce in test environment
      process.env.CLIENT_ORIGIN = 'https://skillgraph.vercel.app,http://localhost:5173';

      app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use(csrfProtection);

      app.get('/api/resource', (req, res) => res.json({ success: true, data: 'resource' }));
      app.post('/api/mutate', (req, res) => res.json({ success: true, updated: true }));
      // eslint-disable-next-line no-unused-vars
      app.use((err, req, res, next) => {
        res.status(err.status || 500).json({
          success: false,
          error: { code: err.code || 'ERROR', message: err.message },
        });
      });
    });

    it('allows safe methods (GET) without CSRF token and issues a token', async () => {
      const res = await request(app).get('/api/resource');
      expect(res.status).toBe(200);
      expect(res.headers['x-csrf-token']).toBeDefined();

      const setCookies = res.headers['set-cookie'];
      expect(setCookies.some((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))).toBe(true);
    });

    it('allows unauthenticated mutations (no auth cookie)', async () => {
      const res = await request(app).post('/api/mutate').send({ title: 'New' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects state-changing requests when Origin is disallowed', async () => {
      const res = await request(app)
        .post('/api/mutate')
        .set('Origin', 'https://malicious-attacker.com')
        .send({ title: 'Attack' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
      expect(res.body.error.message).toMatch(/rejected/i);
    });

    it('blocks authenticated mutation when CSRF token is missing', async () => {
      const res = await request(app)
        .post('/api/mutate')
        .set('Cookie', [`${COOKIE_NAME}=valid_auth_token_jwt`])
        .set('Origin', 'https://skillgraph.vercel.app')
        .send({ test: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
    });

    it('blocks authenticated mutation when CSRF token header does not match cookie', async () => {
      const res = await request(app)
        .post('/api/mutate')
        .set('Cookie', [
          `${COOKIE_NAME}=valid_auth_token_jwt`,
          `${CSRF_COOKIE_NAME}=real_csrf_token_1234567890abcdef`,
        ])
        .set('x-csrf-token', 'fake_csrf_token_1234567890abcdef')
        .set('Origin', 'https://skillgraph.vercel.app')
        .send({ test: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
      expect(res.body.error.message).toMatch(/invalid csrf token/i);
    });

    it('succeeds authenticated mutation when x-csrf-token matches sg_csrf cookie', async () => {
      const validCsrf = 'real_csrf_token_1234567890abcdef';
      const res = await request(app)
        .post('/api/mutate')
        .set('Cookie', [
          `${COOKIE_NAME}=valid_auth_token_jwt`,
          `${CSRF_COOKIE_NAME}=${validCsrf}`,
        ])
        .set('x-csrf-token', validCsrf)
        .set('Origin', 'https://skillgraph.vercel.app')
        .send({ test: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updated).toBe(true);
    });
  });
});
