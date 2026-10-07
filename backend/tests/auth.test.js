import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { auth } from '../src/middleware/auth.js';
import { respond } from '../src/utils/respond.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

let mongoServer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  await User.deleteMany({});
  await Skill.deleteMany({});
  await Career.deleteMany({});
});

afterAll(async () => {
  try {
    await User.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe('Authentication & Meta API (Tasks 1-7)', () => {
  let studentCookie = '';

  it('register ok, sets cookie, returns envelope with user, no passwordHash', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.name).toBe('Test Student');
    expect(res.body.data.user.email).toBe('student@example.com');
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('sg_token='))).toBe(true);
    studentCookie = cookies.find((c) => c.startsWith('sg_token='));
  });

  it('duplicate email registration returns 409 CONFLICT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Student',
      email: 'student@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('registering with {"role":"admin"} returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Admin Attempt',
      email: 'admin_attempt@example.com',
      password: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('wrong password and unknown email give identical 401 message', async () => {
    const resWrongPass = await request(app).post('/api/auth/login').send({
      email: 'student@example.com',
      password: 'WrongPassword999',
    });

    const resUnknownEmail = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'AnyPassword123',
    });

    expect(resWrongPass.status).toBe(401);
    expect(resUnknownEmail.status).toBe(401);
    expect(resWrongPass.body.error.code).toBe('UNAUTHENTICATED');
    expect(resUnknownEmail.body.error.code).toBe('UNAUTHENTICATED');
    expect(resWrongPass.body.error.message).toBe('Invalid email or password');
    expect(resUnknownEmail.body.error.message).toBe('Invalid email or password');
  });

  it('login with valid credentials succeeds and sets cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'student@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('student@example.com');
  });

  it('/api/auth/me without cookie is 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('/api/auth/me with cookie returns 200 and user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [studentCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('student@example.com');
  });

  it('requireRole("admin") blocks student with 403 FORBIDDEN', async () => {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.get('/test-admin', auth, requireRole('admin'), (req, res) => {
      respond.ok(res, { secret: 'admin-area' });
    });
    testApp.use(errorHandler);

    const res = await request(testApp)
      .get('/test-admin')
      .set('Cookie', [studentCookie]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/meta is public and returns metadata structure', async () => {
    const res = await request(app).get('/api/meta');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.levels).toBeInstanceOf(Array);
    expect(res.body.data.categories).toBeInstanceOf(Array);
    expect(res.body.data.relationshipTypes).toContain('PREREQUISITE');
    expect(res.body.data.gapStatuses).toContain('developing');
    expect(res.body.data.nodeStates).toContain('recommended');
    expect(res.body.data.counts).toHaveProperty('skills');
    expect(res.body.data.counts).toHaveProperty('careers');
  });

  it('POST /api/auth/logout clears cookie and returns loggedOut: true', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.loggedOut).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('sg_token=;'))).toBe(true);
  });
});
