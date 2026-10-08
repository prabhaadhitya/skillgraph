import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/user.model.js';
import { Career } from '../src/models/career.model.js';
import { Skill } from '../src/models/skill.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import { AlignmentSnapshot } from '../src/models/alignmentSnapshot.model.js';
import { recordSnapshot } from '../src/services/alignment.service.js';
import { getProfileMap } from '../src/services/profile.service.js';
import { getCareerModel, invalidateCareerModels } from '../src/services/careerModel.service.js';

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

describe('Alignment & Shared Services Integration Tests', () => {
  let testUser = null;
  let testCareer = null;
  let skillA = null;
  let skillB = null;

  beforeEach(async () => {
    invalidateCareerModels();
    await Promise.all([
      User.deleteMany({}),
      Career.deleteMany({}),
      Skill.deleteMany({}),
      CareerSkill.deleteMany({}),
      UserSkill.deleteMany({}),
      AlignmentSnapshot.deleteMany({}),
    ]);

    // Create test career
    testCareer = await Career.create({
      slug: 'ai-engineer',
      name: 'AI Engineer',
      description: 'Build AI applications',
      category: 'ai',
      icon: 'brain',
      isActive: true,
    });

    // Create test skills
    skillA = await Skill.create({
      slug: 'python-core',
      name: 'Python Core',
      description: 'Core Python',
      category: 'programming',
      difficulty: 2,
    });

    skillB = await Skill.create({
      slug: 'neural-nets',
      name: 'Neural Networks',
      description: 'Deep Learning',
      category: 'machine-learning',
      difficulty: 4,
    });

    // Attach skills to career
    await CareerSkill.create([
      {
        careerId: testCareer._id,
        skillId: skillA._id,
        importance: 0.6,
        requiredLevel: 4,
      },
      {
        careerId: testCareer._id,
        skillId: skillB._id,
        importance: 0.4,
        requiredLevel: 4,
      },
    ]);

    // Create test user
    testUser = await User.create({
      name: 'Test Student',
      email: 'student@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      role: 'student',
      targetCareerId: testCareer._id,
      onboardingCompleted: true,
    });
  });

  describe('profile.service.js', () => {
    it('returns a map of skill slugs to levels, omitting level 0', async () => {
      await UserSkill.create([
        {
          userId: testUser._id,
          skillId: skillA._id,
          proficiency: 3,
        },
      ]);

      const profile = await getProfileMap(testUser._id);
      expect(profile).toEqual({
        'python-core': 3,
      });
      // skillB is not present (level 0 is absent)
      expect(profile['neural-nets']).toBeUndefined();
    });

    it('returns an empty object for a user with no skills', async () => {
      const profile = await getProfileMap(testUser._id);
      expect(profile).toEqual({});
    });
  });

  describe('careerModel.service.js', () => {
    it('loads and caches career model with 5-minute TTL, and invalidates on demand', async () => {
      const res1 = await getCareerModel('ai-engineer');
      expect(res1.career.slug).toBe('ai-engineer');
      expect(res1.model.careerSlugs.has('python-core')).toBe(true);

      // Verify cached reference is returned on immediate second call
      const res2 = await getCareerModel('ai-engineer');
      expect(res2).toBe(res1);

      // Invalidate cache
      invalidateCareerModels('ai-engineer');
      const res3 = await getCareerModel('ai-engineer');
      expect(res3).not.toBe(res1); // Freshly generated object
      expect(res3.career.slug).toBe('ai-engineer');
    });

    it('throws 404 when career slug does not exist', async () => {
      await expect(getCareerModel('non-existent-career')).rejects.toThrow();
    });
  });

  describe('alignment.service.js (recordSnapshot)', () => {
    it('computes initial snapshot with null previousScore and correct band', async () => {
      // Empty profile -> early band
      const res = await recordSnapshot(testUser._id, 'onboarding');
      expect(res.score).toBeGreaterThanOrEqual(0);
      expect(res.previousScore).toBeNull();
      expect(res.band).toBe('early');

      const count = await AlignmentSnapshot.countDocuments({ userId: testUser._id });
      expect(count).toBe(1);
    });

    it('updates latest snapshot when called under 60 seconds (snapshot merge)', async () => {
      const t0 = new Date('2026-10-08T12:00:00.000Z');
      const firstRes = await recordSnapshot(testUser._id, 'skills_update', { now: t0 });
      expect(firstRes.previousScore).toBeNull();

      // Raise skill level
      await UserSkill.create({
        userId: testUser._id,
        skillId: skillA._id,
        proficiency: 4,
      });

      // Call 30 seconds later (< 60s)
      const t1 = new Date('2026-10-08T12:00:30.000Z');
      const secondRes = await recordSnapshot(testUser._id, 'skills_update', { now: t1 });

      // Score should have increased
      expect(secondRes.score).toBeGreaterThan(firstRes.score);
      // Because it updated the only existing snapshot, previousScore remains null
      expect(secondRes.previousScore).toBeNull();

      // Database should still contain ONLY 1 snapshot (updated in-place)
      const count = await AlignmentSnapshot.countDocuments({ userId: testUser._id });
      expect(count).toBe(1);

      const latest = await AlignmentSnapshot.findOne({ userId: testUser._id });
      expect(latest.fitScore).toBe(secondRes.score);
    });

    it('creates a new snapshot when called more than 60 seconds later and tracks previousScore', async () => {
      const t0 = new Date('2026-10-08T12:00:00.000Z');
      const firstRes = await recordSnapshot(testUser._id, 'skills_update', { now: t0 });

      // Raise skill level
      await UserSkill.create({
        userId: testUser._id,
        skillId: skillA._id,
        proficiency: 4,
      });

      // Call 75 seconds later (> 60s)
      const t1 = new Date('2026-10-08T12:01:15.000Z');
      const secondRes = await recordSnapshot(testUser._id, 'skills_update', { now: t1 });

      // Database should now have 2 snapshots
      const count = await AlignmentSnapshot.countDocuments({ userId: testUser._id });
      expect(count).toBe(2);

      // secondRes.previousScore must equal firstRes.score
      expect(secondRes.previousScore).toBe(firstRes.score);
      expect(secondRes.score).toBeGreaterThan(firstRes.score);
    });

    it('correctly reports previousScore when updating a snapshot that has older history', async () => {
      // Snapshot 1 (10 minutes ago)
      const t0 = new Date('2026-10-08T12:00:00.000Z');
      await recordSnapshot(testUser._id, 'onboarding', { now: t0 });

      // Snapshot 2 (5 minutes ago)
      const t1 = new Date('2026-10-08T12:05:00.000Z');
      await UserSkill.create({
        userId: testUser._id,
        skillId: skillA._id,
        proficiency: 2,
      });
      const snap2 = await recordSnapshot(testUser._id, 'skills_update', { now: t1 });
      expect(snap2.previousScore).not.toBeNull();

      // Snapshot 3 (30 seconds after snapshot 2 -> under 60s merge)
      const t2 = new Date('2026-10-08T12:05:30.000Z');
      await UserSkill.findOneAndUpdate(
        { userId: testUser._id, skillId: skillA._id },
        { $set: { proficiency: 4 } },
      );
      const snap3 = await recordSnapshot(testUser._id, 'skills_update', { now: t2 });

      // Total count remains 2 (snap2 was updated)
      const count = await AlignmentSnapshot.countDocuments({ userId: testUser._id });
      expect(count).toBe(2);

      // snap3.previousScore should still point to Snapshot 1's score!
      const snap1 = await AlignmentSnapshot.findOne({ userId: testUser._id, createdAt: t0 });
      expect(snap3.previousScore).toBe(snap1.fitScore);
    });

    it('correctly categorizes bands: early (<40), developing (<70), strong (>=70)', async () => {
      // 1. Empty profile -> early
      const early = await recordSnapshot(testUser._id);
      expect(early.band).toBe('early');

      // 2. Partial proficiency -> developing
      await UserSkill.create({
        userId: testUser._id,
        skillId: skillA._id,
        proficiency: 3,
      });
      const developing = await recordSnapshot(testUser._id, 'skills_update', {
        now: new Date(Date.now() + 100000),
      });
      expect(developing.band).toBe('developing');

      // 3. Full proficiency on both skills -> strong (100 fitScore)
      await UserSkill.findOneAndUpdate(
        { userId: testUser._id, skillId: skillA._id },
        { $set: { proficiency: 4 } },
      );
      await UserSkill.create({
        userId: testUser._id,
        skillId: skillB._id,
        proficiency: 4,
      });
      const strong = await recordSnapshot(testUser._id, 'skills_update', {
        now: new Date(Date.now() + 200000),
      });
      expect(strong.score).toBe(100);
      expect(strong.band).toBe('strong');
    });
  });
});
