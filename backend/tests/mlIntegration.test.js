import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { mlClient } from '../src/services/mlClient.js';

let mongoServer = null;
let adminCookie = '';
let studentCookie = '';
let testCareer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 60000 } });
  await mongoose.connect(mongoServer.getUri());

  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
  ]);

  // Seed sample career and skills
  const python = await Skill.create({
    slug: 'python',
    name: 'Python',
    category: 'programming',
    difficulty: 2,
  });

  const stats = await Skill.create({
    slug: 'statistics',
    name: 'Statistics',
    category: 'data-analytics',
    difficulty: 3,
  });

  testCareer = await Career.create({
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    category: 'software',
    icon: 'cpu',
    isActive: true,
  });

  await CareerSkill.create({
    careerId: testCareer._id,
    skillId: python._id,
    importance: 0.9,
    requiredLevel: 4,
  });

  await CareerSkill.create({
    careerId: testCareer._id,
    skillId: stats._id,
    importance: 0.85,
    requiredLevel: 4,
  });

  // Create admin
  const regAdmin = await request(app).post('/api/auth/register').send({
    name: 'Admin User',
    email: 'admin_ml@example.com',
    password: 'Password123!',
  });
  await User.updateOne({ email: 'admin_ml@example.com' }, { role: 'admin' });
  adminCookie = regAdmin.headers['set-cookie'].find((c) => c.startsWith('sg_token='));

  // Create student
  const regStudent = await request(app).post('/api/auth/register').send({
    name: 'Student User',
    email: 'student_ml@example.com',
    password: 'Password123!',
  });
  studentCookie = regStudent.headers['set-cookie'].find((c) => c.startsWith('sg_token='));
  await User.updateOne(
    { email: 'student_ml@example.com' },
    { targetCareerId: testCareer._id },
  );
}, 90000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe('ML Integration & Recommendations Endpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/recommendations/next-skills', () => {
    it('returns strategy "ml" with recommendations when ML service succeeds', async () => {
      vi.spyOn(mlClient, 'recommend').mockResolvedValueOnce({
        modelVersion: 'v1',
        model: { name: 'GradientBoosting', version: 'v1' },
        items: [
          { skillSlug: 'statistics', score: 0.88 },
          { skillSlug: 'python', score: 0.75 },
        ],
      });

      const res = await request(app)
        .get('/api/recommendations/next-skills?limit=3&strategy=auto')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strategy).toBe('ml');
      expect(res.body.data.fallbackReason).toBeNull();
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items[0].skill.slug).toBe('statistics');
    });

    it('L7: falls back safely to strategy "rule" with fallbackReason "ML_UNAVAILABLE" when ML fails', async () => {
      vi.spyOn(mlClient, 'recommend').mockRejectedValueOnce(
        new Error('Connection refused: ECONNREFUSED on port 8000'),
      );

      const res = await request(app)
        .get('/api/recommendations/next-skills?limit=3&strategy=auto')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strategy).toBe('rule');
      expect(res.body.data.fallbackReason).toBe('ML_UNAVAILABLE');
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analysis/dashboard (Strategy & Fallback)', () => {
    it('returns strategy "ml" when ML service is operational', async () => {
      vi.spyOn(mlClient, 'recommend').mockResolvedValueOnce({
        modelVersion: 'v1',
        model: { name: 'GradientBoosting', version: 'v1' },
        items: [{ skillSlug: 'statistics', score: 0.91 }],
      });

      const res = await request(app)
        .get('/api/analysis/dashboard')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strategy).toBe('ml');
      expect(res.body.data.fallbackReason).toBeNull();
    });

    it('returns strategy "rule" and fallbackReason "ML_UNAVAILABLE" when ML service is down', async () => {
      vi.spyOn(mlClient, 'recommend').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/analysis/dashboard')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strategy).toBe('rule');
      expect(res.body.data.fallbackReason).toBe('ML_UNAVAILABLE');
    });
  });

  describe('GET /admin/ml/info and /api/admin/ml/info', () => {
    it('returns 403 FORBIDDEN when accessed by non-admin student', async () => {
      const res = await request(app)
        .get('/api/admin/ml/info')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 with model info when ML service is up', async () => {
      vi.spyOn(mlClient, 'modelInfo').mockResolvedValueOnce({
        modelVersion: 'v1',
        algorithm: 'GradientBoosting',
        trainedOn: 'synthetic',
        trainingProfiles: 5000,
        metrics: {
          ml: { hitRateAt3: 0.616, precisionAt3: 0.196, recallAt3: 0.587, mrr: 0.473 },
          baseline: { hitRateAt3: 0.591, precisionAt3: 0.197, recallAt3: 0.591, mrr: 0.464 },
        },
      });

      const res = await request(app)
        .get('/api/admin/ml/info')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.algorithm).toBe('GradientBoosting');
      expect(res.body.data.trainedOn).toBe('synthetic');
    });

    it('returns 200 with { available: false } when ML service is down', async () => {
      vi.spyOn(mlClient, 'modelInfo').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/admin/ml/info')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ available: false });
    });

    it('supports root /admin/ml/info route as well', async () => {
      vi.spyOn(mlClient, 'modelInfo').mockResolvedValueOnce({
        modelVersion: 'v1',
        algorithm: 'GradientBoosting',
      });

      const res = await request(app)
        .get('/admin/ml/info')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
    });
  });
});
