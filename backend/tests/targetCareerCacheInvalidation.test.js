import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Career } from '../src/models/career.model.js';
import { Skill } from '../src/models/skill.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import { AlignmentSnapshot } from '../src/models/alignmentSnapshot.model.js';
import {
  resolveCareerSlug,
  invalidateUserCareer,
  isUserCareerCached,
  getCachedUserCareer,
} from '../src/services/analysis.service.js';
import { updateProfile } from '../src/services/user.service.js';
import { invalidateCareerModels } from '../src/services/careerModel.service.js';
import { invalidateProfile } from '../src/services/profile.service.js';

let mongoServer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());
});

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

describe('Target Career Cache Invalidation & Fresh Analysis Regression', () => {
  let student = null;
  let studentCookie = '';
  let careerA = null;
  let careerB = null;
  let skillPy = null;
  let skillSql = null;
  let skillCloud = null;

  beforeEach(async () => {
    vi.restoreAllMocks();
    process.env.ENABLE_CAREER_CACHE = 'true';
    invalidateUserCareer();
    invalidateProfile();
    invalidateCareerModels();

    await Promise.all([
      User.deleteMany({}),
      Career.deleteMany({}),
      Skill.deleteMany({}),
      CareerSkill.deleteMany({}),
      UserSkill.deleteMany({}),
      AlignmentSnapshot.deleteMany({}),
    ]);

    // Create 2 distinct careers
    careerA = await Career.create({
      slug: 'ai-engineer',
      name: 'AI Engineer',
      description: 'Build AI applications',
      category: 'ai',
      icon: 'brain',
      isActive: true,
    });

    careerB = await Career.create({
      slug: 'data-scientist',
      name: 'Data Scientist',
      description: 'Analyze data and build predictive models',
      category: 'data',
      icon: 'database',
      isActive: true,
    });

    // Create skills
    skillPy = await Skill.create({
      slug: 'python',
      name: 'Python',
      category: 'programming',
      difficulty: 2,
    });

    skillSql = await Skill.create({
      slug: 'sql',
      name: 'SQL',
      category: 'database',
      difficulty: 2,
    });

    skillCloud = await Skill.create({
      slug: 'machine-learning',
      name: 'Machine Learning',
      category: 'machine-learning',
      difficulty: 3,
    });

    // Career skills mapping
    await CareerSkill.create([
      { careerId: careerA._id, skillId: skillPy._id, requiredLevel: 3, importance: 1.0 },
      { careerId: careerA._id, skillId: skillSql._id, requiredLevel: 2, importance: 0.8 },
      { careerId: careerB._id, skillId: skillCloud._id, requiredLevel: 3, importance: 1.0 },
      { careerId: careerB._id, skillId: skillSql._id, requiredLevel: 2, importance: 0.7 },
    ]);

    // Register test student initially targeting careerA
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Rivera',
        email: 'alex@example.com',
        password: 'Password123!',
      });
    expect(regRes.status).toBe(201);
    studentCookie = regRes.headers['set-cookie'][0];
    student = await User.findById(regRes.body.data.user.id);

    // Set initial career to careerA
    student.targetCareerId = careerA._id;
    student.onboardingCompleted = true;
    await student.save();

    // User skills: python level 2
    await UserSkill.create({
      userId: student._id,
      skillId: skillPy._id,
      proficiency: 2,
      source: 'self',
    });
  });

  describe('1. HTTP API Integration Flow', () => {
    it('immediately reflects new career in analysis after PATCH /api/users/me without waiting for TTL', async () => {
      // Step 1: Initial analysis request (no ?career= query param, relies on resolved user target career)
      const resFit1 = await request(app)
        .get('/api/analysis/career-fit')
        .set('Cookie', studentCookie);

      expect(resFit1.status).toBe(200);
      expect(resFit1.body.data.career.slug).toBe('ai-engineer');

      // Verify the initial career is cached in memory
      expect(isUserCareerCached(student._id)).toBe(true);
      expect(getCachedUserCareer(student._id)).toBe('ai-engineer');

      // Step 2: Change student career to careerB via PATCH /api/users/me
      const patchRes = await request(app)
        .patch('/api/users/me')
        .set('Cookie', studentCookie)
        .send({ targetCareerSlug: 'data-scientist' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.user.targetCareer.slug).toBe('data-scientist');

      // Step 3: Cache must be invalidated immediately by the career update
      expect(isUserCareerCached(student._id)).toBe(false);

      // Step 4: Immediately request analysis again WITHOUT waiting for 30s TTL
      const resFit2 = await request(app)
        .get('/api/analysis/career-fit')
        .set('Cookie', studentCookie);

      expect(resFit2.status).toBe(200);
      // Critical check: MUST use data-scientist, NOT the stale ai-engineer!
      expect(resFit2.body.data.career.slug).toBe('data-scientist');

      // Verify new career is now cached
      expect(isUserCareerCached(student._id)).toBe(true);
      expect(getCachedUserCareer(student._id)).toBe('data-scientist');

      // Step 5: Check other analysis endpoints use the updated career immediately
      const resGap = await request(app)
        .get('/api/analysis/skill-gap')
        .set('Cookie', studentCookie);
      expect(resGap.status).toBe(200);
      expect(resGap.body.data.career.slug).toBe('data-scientist');

      const resPath = await request(app)
        .get('/api/analysis/learning-path')
        .set('Cookie', studentCookie);
      expect(resPath.status).toBe(200);
      expect(resPath.body.data.career.slug).toBe('data-scientist');

      const resDash = await request(app)
        .get('/api/analysis/dashboard')
        .set('Cookie', studentCookie);
      expect(resDash.status).toBe(200);
      expect(resDash.body.data.career.slug).toBe('data-scientist');
    });
  });

  describe('2. Service Level Invalidation & Cache Mechanics', () => {
    it('invalidates cache when updateProfile changes targetCareerSlug', async () => {
      // Warm up cache
      const initialSlug = await resolveCareerSlug(student._id);
      expect(initialSlug).toBe('ai-engineer');
      expect(isUserCareerCached(student._id)).toBe(true);

      // Update profile with new career slug
      await updateProfile(student._id, { targetCareerSlug: 'data-scientist' });

      // Cache is purged
      expect(isUserCareerCached(student._id)).toBe(false);

      // Subsequent resolve returns new career slug immediately
      const freshSlug = await resolveCareerSlug(student._id);
      expect(freshSlug).toBe('data-scientist');
      expect(getCachedUserCareer(student._id)).toBe('data-scientist');
    });

    it('demonstrates stale result would occur without invalidation, and verifies invalidation fixes it', async () => {
      // 1. Warm cache with initial career
      await resolveCareerSlug(student._id);
      expect(getCachedUserCareer(student._id)).toBe('ai-engineer');

      // 2. Simulate raw DB change without calling invalidateUserCareer
      await User.updateOne({ _id: student._id }, { $set: { targetCareerId: careerB._id } });

      // Because cache was not invalidated, resolveCareerSlug would return stale value
      const staleSlug = await resolveCareerSlug(student._id);
      expect(staleSlug).toBe('ai-engineer');

      // 3. Now execute invalidateUserCareer
      invalidateUserCareer(student._id);
      expect(isUserCareerCached(student._id)).toBe(false);

      // 4. Now resolveCareerSlug immediately reads DB and returns the fresh value
      const updatedSlug = await resolveCareerSlug(student._id);
      expect(updatedSlug).toBe('data-scientist');
    });

    it('handles edge cases safely (null, undefined, ObjectId, and multi-user isolation)', async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      // Seed both in cache
      await resolveCareerSlug(student._id);
      expect(isUserCareerCached(student._id)).toBe(true);

      // Invalidate different user
      invalidateUserCareer(otherUserId);
      expect(isUserCareerCached(student._id)).toBe(true); // Student still cached!

      // Safe against null/undefined
      expect(() => invalidateUserCareer(null)).not.toThrow();
      expect(isUserCareerCached(student._id)).toBe(false); // Cleared all

      // Invalidate single user safely
      await resolveCareerSlug(student._id);
      expect(isUserCareerCached(student._id)).toBe(true);
      invalidateUserCareer(student._id.toString());
      expect(isUserCareerCached(student._id)).toBe(false);
    });
  });
});
