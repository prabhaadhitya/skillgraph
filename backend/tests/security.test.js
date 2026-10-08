import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { getCookieOptions, COOKIE_NAME } from '../src/utils/authCookie.js';

let mongoServer;
let studentCookie = '';
let adminCookie = '';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  await User.deleteMany({});
  await Skill.deleteMany({});
  await Career.deleteMany({});

  // Seed sample career and skill
  await Skill.create({
    slug: 'python-security',
    name: 'Python Security',
    description: 'Security fundamentals with Python',
    category: 'programming',
    difficulty: 2,
  });

  await Career.create({
    slug: 'security-engineer',
    name: 'Security Engineer',
    description: 'Security analysis and defense',
    category: 'software',
    icon: 'shield',
    isActive: true,
  });

  // Create Student
  const regStudent = await request(app).post('/api/auth/register').send({
    name: 'Security Student',
    email: 'secstudent@example.com',
    password: 'Password123!',
  });
  studentCookie = regStudent.headers['set-cookie'].find((c) => c.startsWith(`${COOKIE_NAME}=`));

  // Create Admin
  const regAdmin = await request(app).post('/api/auth/register').send({
    name: 'Security Admin',
    email: 'secadmin@example.com',
    password: 'Password123!',
  });
  await User.updateOne({ email: 'secadmin@example.com' }, { role: 'admin' });
  adminCookie = regAdmin.headers['set-cookie'].find((c) => c.startsWith(`${COOKIE_NAME}=`));
});

afterAll(async () => {
  try {
    await User.deleteMany({});
    await Skill.deleteMany({});
    await Career.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // cleanup
  }
});

describe('Security Hardening & Verification Suite', () => {
  // =========================================================================
  // A1: Register valid user (201, cookie set, no passwordHash)
  // =========================================================================
  it('A1: Register valid user sets cookie, returns 201, and never leaks passwordHash', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Fresh Student',
      email: 'fresh@example.com',
      password: 'SecurePassword123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('fresh@example.com');
    expect(res.body.data.user.role).toBe('student');

    // Never returned in JSON
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    // Cookie verification
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');
    expect(tokenCookie).toMatch(/SameSite=Lax/i);
  });

  // =========================================================================
  // A2: Register duplicate email (409 CONFLICT)
  // =========================================================================
  it('A2: Registering duplicate email returns 409 CONFLICT with standard error envelope', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Student',
      email: 'secstudent@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  // =========================================================================
  // A3: Register with role: "admin" rejected by strict schema (400 VALIDATION_ERROR)
  // =========================================================================
  it('A3: Registering with {"role":"admin"} is rejected with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Attacker Admin',
      email: 'attacker@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Validation failed');
  });

  // =========================================================================
  // A4: Login unknown email vs wrong password give identical 401 message
  // =========================================================================
  it('A4: Login with unknown email and wrong password return identical 401 message', async () => {
    const resWrongPass = await request(app).post('/api/auth/login').send({
      email: 'secstudent@example.com',
      password: 'WrongPassword999!',
    });

    const resUnknownUser = await request(app).post('/api/auth/login').send({
      email: 'nonexistent-user-999@example.com',
      password: 'Password123!',
    });

    expect(resWrongPass.status).toBe(401);
    expect(resUnknownUser.status).toBe(401);

    expect(resWrongPass.body.success).toBe(false);
    expect(resUnknownUser.body.success).toBe(false);

    expect(resWrongPass.body.error.code).toBe('UNAUTHENTICATED');
    expect(resUnknownUser.body.error.code).toBe('UNAUTHENTICATED');

    expect(resWrongPass.body.error.message).toBe('Invalid email or password');
    expect(resUnknownUser.body.error.message).toBe('Invalid email or password');
  });

  // =========================================================================
  // A5: GET /api/auth/me without cookie is 401 UNAUTHENTICATED
  // =========================================================================
  it('A5: GET /api/auth/me without cookie returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  // =========================================================================
  // A6: Student calls /api/admin/skills is 403 FORBIDDEN
  // =========================================================================
  it('A6: Student role calling /api/admin/skills returns 403 FORBIDDEN, while admin succeeds', async () => {
    const studentRes = await request(app)
      .post('/api/admin/skills')
      .set('Cookie', studentCookie)
      .send({
        slug: 'hacked-skill',
        name: 'Hacked Skill',
        category: 'programming',
        difficulty: 3,
      });

    expect(studentRes.status).toBe(403);
    expect(studentRes.body.success).toBe(false);
    expect(studentRes.body.error.code).toBe('FORBIDDEN');

    const adminRes = await request(app)
      .post('/api/admin/skills')
      .set('Cookie', adminCookie)
      .send({
        slug: 'legit-admin-skill',
        name: 'Legit Admin Skill',
        category: 'programming',
        difficulty: 3,
      });

    expect(adminRes.status).toBe(201);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.data.skill.slug).toBe('legit-admin-skill');
  });

  // =========================================================================
  // A16: Rate limit on /api/auth/login returns 429 after threshold
  // =========================================================================
  describe('A16: Rate limiting on authentication routes', () => {
    const originalEnvLimit = process.env.AUTH_RATE_LIMIT_MAX;

    afterEach(() => {
      if (originalEnvLimit !== undefined) {
        process.env.AUTH_RATE_LIMIT_MAX = originalEnvLimit;
      } else {
        delete process.env.AUTH_RATE_LIMIT_MAX;
      }
    });

    it('returns 429 RATE_LIMITED after threshold is exceeded on login', async () => {
      // Set limit low (3 requests)
      process.env.AUTH_RATE_LIMIT_MAX = '3';

      const results = [];
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'rate-limit-test@example.com',
            password: 'WrongPassword123!',
          });
        results.push(res);
      }

      // First 3 requests should be processed (401 unauthenticated)
      expect(results[0].status).toBe(401);
      expect(results[1].status).toBe(401);
      expect(results[2].status).toBe(401);

      // 4th request exceeds threshold -> 429 RATE_LIMITED
      expect(results[3].status).toBe(429);
      expect(results[3].body.success).toBe(false);
      expect(results[3].body.error.code).toBe('RATE_LIMITED');
      expect(results[3].body.error.message).toMatch(/too many.*attempts/i);
    });
  });

  // =========================================================================
  // A17: Standard response envelope verification across route sample calls
  // =========================================================================
  describe('A17: Response envelope on all registered routes', () => {
    const testCases = [
      { name: 'GET /api/health', method: 'get', url: '/api/health', auth: false, expectedStatus: 200 },
      { name: 'GET /api/meta', method: 'get', url: '/api/meta', auth: false, expectedStatus: 200 },
      { name: 'GET /api/skills', method: 'get', url: '/api/skills', auth: true, expectedStatus: 200 },
      { name: 'GET /api/careers', method: 'get', url: '/api/careers', auth: true, expectedStatus: 200 },
      { name: 'GET /api/auth/me', method: 'get', url: '/api/auth/me', auth: true, expectedStatus: 200 },
      { name: 'GET /api/users/me', method: 'get', url: '/api/users/me', auth: true, expectedStatus: 200 },
      { name: 'GET /api/settings/llm', method: 'get', url: '/api/settings/llm', auth: true, expectedStatus: 200 },
      { name: 'POST /api/auth/register (invalid)', method: 'post', url: '/api/auth/register', body: {}, expectedStatus: 400 },
      { name: 'POST /api/auth/login (invalid)', method: 'post', url: '/api/auth/login', body: {}, expectedStatus: 400 },
      { name: 'GET /api/unknown-route', method: 'get', url: '/api/unknown-route', expectedStatus: 404 },
    ];

    testCases.forEach(({ name, method, url, auth, body, expectedStatus }) => {
      it(`asserts response envelope on ${name}`, async () => {
        let req = request(app)[method](url);
        if (auth) {
          req = req.set('Cookie', studentCookie);
        }
        if (body) {
          req = req.send(body);
        }

        const res = await req;
        expect(res.status).toBe(expectedStatus);

        // Envelope assertion
        expect(res.body).toHaveProperty('success');
        expect(typeof res.body.success).toBe('boolean');

        if (res.body.success) {
          expect(res.body).toHaveProperty('data');
          expect(res.body.error).toBeUndefined();
        } else {
          expect(res.body).toHaveProperty('error');
          expect(res.body.error).toHaveProperty('code');
          expect(res.body.error).toHaveProperty('message');
          expect(typeof res.body.error.code).toBe('string');
          expect(typeof res.body.error.message).toBe('string');
        }
      });
    });
  });

  // =========================================================================
  // Mongo Query Operator Injection Prevention
  // =========================================================================
  describe('Mongo operator injection sanitizer', () => {
    it('rejects request body containing $ operator key with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/prohibited mongodb operator/i);
    });

    it('rejects nested request body containing $ operator key with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker',
          email: 'hacker@example.com',
          password: 'Password123!',
          nested: { filter: { $gt: 1 } },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects query parameter containing $ operator key with 400', async () => {
      const res = await request(app)
        .get('/api/skills?category[$ne]=admin')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // Central Error Handler: Production stack shielding
  // =========================================================================
  describe('Central error handler in production', () => {
    it('never leaks stack trace or internal details in production environment', async () => {
      const testApp = express();
      testApp.get('/test-crash', () => {
        throw new Error('Secret database internal connection leak!');
      });
      testApp.use(errorHandler);

      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const res = await request(testApp).get('/test-crash');

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INTERNAL_ERROR');
        expect(res.body.error.message).toBe('Internal server error');
        expect(res.body.error.stack).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toContain('Secret database');
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  // =========================================================================
  // Security Headers (Helmet, CORS, Cookies)
  // =========================================================================
  describe('Transport & Security Headers', () => {
    it('sets helmet security headers and removes X-Powered-By', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('sets CORS headers allowing credentials with configured origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('cookie options enforce httpOnly, sameSite Lax, 7 days, and Secure in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const opts = getCookieOptions();

        expect(opts.httpOnly).toBe(true);
        expect(opts.sameSite).toBe('lax');
        expect(opts.secure).toBe(true);
        expect(opts.path).toBe('/');
        expect(opts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  // =========================================================================
  // User Model Security: passwordHash is select: false
  // =========================================================================
  describe('User model password hash protection', () => {
    it('User queries do not return passwordHash by default', async () => {
      const user = await User.findOne({ email: 'secstudent@example.com' });
      expect(user).toBeDefined();
      expect(user.passwordHash).toBeUndefined();
      expect(user.toJSON().passwordHash).toBeUndefined();
    });
  });
});
