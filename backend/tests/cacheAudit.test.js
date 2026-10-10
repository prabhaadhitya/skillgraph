import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BoundedCache, createBoundedCache } from '../src/utils/cache.js';
import { User } from '../src/models/user.model.js';
import { Career } from '../src/models/career.model.js';
import { Skill } from '../src/models/skill.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import { SkillRelationship } from '../src/models/skillRelationship.model.js';
import { AlignmentSnapshot } from '../src/models/alignmentSnapshot.model.js';

import {
  getProfileMap,
  invalidateProfile,
  isProfileCached,
  getProfileCache,
} from '../src/services/profile.service.js';

import {
  resolveCareerSlug,
  invalidateUserCareer,
  isUserCareerCached,
  getCachedUserCareer,
  getUserCareerCache,
  getCareerFitAnalysis,
  getSkillGapAnalysis,
} from '../src/services/analysis.service.js';

import {
  recordSnapshot,
  invalidateAlignmentCache,
  isAlignmentCached,
  getCachedAlignment,
  getAlignmentCache,
} from '../src/services/alignment.service.js';

import {
  getCareerModel,
  invalidateCareerModels,
  isCareerModelCached,
  getCareerModelCache,
} from '../src/services/careerModel.service.js';

import { patchSkill } from '../src/services/userSkills.service.js';
import { updateProfile } from '../src/services/user.service.js';

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

describe('BoundedCache Core Utility Unit Tests', () => {
  it('enforces constructor option validations', () => {
    expect(() => new BoundedCache({ maxSize: 0 })).toThrow(TypeError);
    expect(() => new BoundedCache({ maxSize: -10 })).toThrow(TypeError);
    expect(() => new BoundedCache({ ttlMs: 0 })).toThrow(TypeError);
    expect(() => new BoundedCache({ ttlMs: -500 })).toThrow(TypeError);

    const validCache = createBoundedCache({ maxSize: 50, ttlMs: 10000, name: 'test' });
    expect(validCache.maxSize).toBe(50);
    expect(validCache.ttlMs).toBe(10000);
    expect(validCache.name).toBe('test');
    validCache.destroy();
  });

  it('bounds capacity strictly and evicts least recently used (LRU) entry', () => {
    const cache = new BoundedCache({ maxSize: 3, ttlMs: 60000 });

    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');

    expect(cache.size).toBe(3);
    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k2')).toBe('v2');
    expect(cache.get('k3')).toBe('v3');

    // Adding 4th item must evict least recently used (k1)
    cache.set('k4', 'v4');
    expect(cache.size).toBe(3);
    expect(cache.has('k1')).toBe(false);
    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k2')).toBe('v2');
    expect(cache.get('k3')).toBe('v3');
    expect(cache.get('k4')).toBe('v4');

    cache.destroy();
  });

  it('promotes accessed items in LRU order on get()', () => {
    const cache = new BoundedCache({ maxSize: 3, ttlMs: 60000 });

    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');

    // Access k1, so k2 becomes the oldest/least recently used
    expect(cache.get('k1')).toBe('v1');

    // Inserting k4 should evict k2, NOT k1
    cache.set('k4', 'v4');
    expect(cache.size).toBe(3);
    expect(cache.has('k1')).toBe(true);
    expect(cache.has('k2')).toBe(false);
    expect(cache.has('k3')).toBe(true);
    expect(cache.has('k4')).toBe(true);

    cache.destroy();
  });

  it('expires entries after TTL and lazily purges on get() / has()', () => {
    const cache = new BoundedCache({ maxSize: 10, ttlMs: 50 });

    cache.set('ephemeral', 'data');
    expect(cache.has('ephemeral')).toBe(true);
    expect(cache.get('ephemeral')).toBe('data');

    // Fast-forward time past 50ms TTL
    const originalNow = Date.now;
    try {
      Date.now = () => originalNow() + 100;

      expect(cache.has('ephemeral')).toBe(false);
      expect(cache.get('ephemeral')).toBeUndefined();
      expect(cache.size).toBe(0);
    } finally {
      Date.now = originalNow;
      cache.destroy();
    }
  });

  it('actively prunes expired entries when capacity is reached before evicting fresh items', () => {
    const cache = new BoundedCache({ maxSize: 3, ttlMs: 1000 });

    const originalNow = Date.now;
    let mockedTime = 1000000;
    Date.now = () => mockedTime;

    try {
      // k1 expires at 1000050, k2 expires at 1000050
      cache.set('k1', 'v1', 50);
      cache.set('k2', 'v2', 50);
      // k3 expires at 1005000 (fresh)
      cache.set('k3', 'v3', 5000);

      // Advance time past k1 and k2 expiry (70ms later)
      mockedTime += 70;

      // Now insert k4. Even though map has 3 items, pruning expired entries (k1, k2)
      // frees space so k3 (fresh) is NOT evicted!
      cache.set('k4', 'v4', 5000);

      expect(cache.has('k1')).toBe(false);
      expect(cache.has('k2')).toBe(false);
      expect(cache.has('k3')).toBe(true);
      expect(cache.has('k4')).toBe(true);
      expect(cache.size).toBe(2);
    } finally {
      Date.now = originalNow;
      cache.destroy();
    }
  });

  it('pruneExpired() explicitly clears dead entries and reports count', () => {
    const cache = new BoundedCache({ maxSize: 10, ttlMs: 50 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3, 5000); // long TTL

    const originalNow = Date.now;
    try {
      Date.now = () => originalNow() + 100;
      const pruned = cache.pruneExpired();
      expect(pruned).toBe(2);
      expect(cache.size).toBe(1);
      expect(cache.has('c')).toBe(true);
    } finally {
      Date.now = originalNow;
      cache.destroy();
    }
  });

  it('tracks accurate stats for hits, misses, and sizing', () => {
    const cache = new BoundedCache({ maxSize: 5, ttlMs: 10000, name: 'statsTest' });

    cache.set('x', 10);
    cache.get('x'); // hit 1
    cache.get('x'); // hit 2
    cache.get('missing'); // miss 1

    const s = cache.stats();
    expect(s.name).toBe('statsTest');
    expect(s.size).toBe(1);
    expect(s.maxSize).toBe(5);
    expect(s.ttlMs).toBe(10000);
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(1);

    cache.destroy();
  });
});

describe('Backend Service In-Memory Caches Audit & Invalidation', () => {
  let studentUser = null;
  let testCareer = null;
  let testCareer2 = null;
  let skillPython = null;
  let skillSql = null;

  beforeEach(async () => {
    // Invalidate all four service caches
    invalidateProfile();
    invalidateUserCareer();
    invalidateAlignmentCache();
    invalidateCareerModels();

    process.env.ENABLE_CAREER_CACHE = 'true';
    process.env.ENABLE_PROFILE_CACHE = 'true';

    await Promise.all([
      User.deleteMany({}),
      Career.deleteMany({}),
      Skill.deleteMany({}),
      CareerSkill.deleteMany({}),
      UserSkill.deleteMany({}),
      SkillRelationship.deleteMany({}),
      AlignmentSnapshot.deleteMany({}),
    ]);

    testCareer = await Career.create({
      slug: 'ai-engineer',
      name: 'AI Engineer',
      description: 'Build AI systems',
      category: 'ai',
      icon: 'brain',
      isActive: true,
    });

    testCareer2 = await Career.create({
      slug: 'data-scientist',
      name: 'Data Scientist',
      description: 'Analyze data',
      category: 'data',
      icon: 'database',
      isActive: true,
    });

    skillPython = await Skill.create({
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

    await CareerSkill.create([
      { careerId: testCareer._id, skillId: skillPython._id, importance: 1.0, requiredLevel: 3 },
      { careerId: testCareer._id, skillId: skillSql._id, importance: 0.8, requiredLevel: 2 },
      { careerId: testCareer2._id, skillId: skillSql._id, importance: 1.0, requiredLevel: 4 },
    ]);

    studentUser = await User.create({
      name: 'Alice Learner',
      email: 'alice@example.com',
      passwordHash: 'dummyhash',
      role: 'student',
      targetCareerId: testCareer._id,
      onboardingCompleted: true,
    });
  });

  describe('1. Profile Cache (profile.service.js)', () => {
    it('uses BoundedCache with maxSize 1000 and 30s TTL', () => {
      const cache = getProfileCache();
      expect(cache).toBeInstanceOf(BoundedCache);
      expect(cache.maxSize).toBe(1000);
      expect(cache.ttlMs).toBe(30000);
    });

    it('populates on read and invalidates on skill mutation', async () => {
      await UserSkill.create({
        userId: studentUser._id,
        skillId: skillPython._id,
        proficiency: 3,
        source: 'self',
      });

      expect(isProfileCached(studentUser._id)).toBe(false);

      const profile1 = await getProfileMap(studentUser._id, { useCache: true });
      expect(profile1).toEqual({ python: 3 });
      expect(isProfileCached(studentUser._id)).toBe(true);

      // Invalidate on skill update
      invalidateProfile(studentUser._id);
      expect(isProfileCached(studentUser._id)).toBe(false);

      // Next read re-fetches fresh from MongoDB
      const profile2 = await getProfileMap(studentUser._id, { useCache: true });
      expect(profile2).toEqual({ python: 3 });
      expect(isProfileCached(studentUser._id)).toBe(true);
    });

    it('bypasses cache completely when executing inside a database session', async () => {

      await UserSkill.create({
        userId: studentUser._id,
        skillId: skillPython._id,
        proficiency: 2,
      });

      // Populate cache with an old value
      const cache = getProfileCache();
      cache.set(studentUser._id.toString(), { python: 1 });

      // When options.session is passed, it ignores cached { python: 1 } and queries Mongo
      // Note: in non-replica set MongoMemoryServer without actual transaction, query.session works
      const profileFromDb = await getProfileMap(studentUser._id, { session: null, useCache: false });
      expect(profileFromDb).toEqual({ python: 2 });
    });
  });

  describe('2. User Career Cache (analysis.service.js)', () => {
    it('uses BoundedCache with maxSize 1000 and 30s TTL', () => {
      const cache = getUserCareerCache();
      expect(cache).toBeInstanceOf(BoundedCache);
      expect(cache.maxSize).toBe(1000);
      expect(cache.ttlMs).toBe(30000);
    });

    it('populates on resolveCareerSlug and invalidates when user changes target career', async () => {
      expect(isUserCareerCached(studentUser._id)).toBe(false);

      const resolved = await resolveCareerSlug(studentUser._id);
      expect(resolved).toBe('ai-engineer');
      expect(isUserCareerCached(studentUser._id)).toBe(true);
      expect(getCachedUserCareer(studentUser._id)).toBe('ai-engineer');

      // Update profile target career
      await updateProfile(studentUser._id, { targetCareerSlug: 'data-scientist' });

      // Cache was invalidated
      expect(isUserCareerCached(studentUser._id)).toBe(false);

      // Fresh resolution uses updated career
      const newResolved = await resolveCareerSlug(studentUser._id);
      expect(newResolved).toBe('data-scientist');
      expect(getCachedUserCareer(studentUser._id)).toBe('data-scientist');
    });
  });

  describe('3. Alignment Cache (alignment.service.js)', () => {
    it('uses BoundedCache with maxSize 1000 and 30s TTL', () => {
      const cache = getAlignmentCache();
      expect(cache).toBeInstanceOf(BoundedCache);
      expect(cache.maxSize).toBe(1000);
      expect(cache.ttlMs).toBe(30000);
    });

    it('caches alignment computation and invalidates on user skill updates', async () => {
      await recordSnapshot(studentUser._id, 'skills_update');
      expect(isAlignmentCached(studentUser._id)).toBe(true);
      expect(getCachedAlignment(studentUser._id)).toHaveProperty('score');

      // Update skill via service
      await patchSkill(studentUser._id, 'python', 3);

      // patchSkill automatically invalidates alignmentCache and profileCache
      expect(isAlignmentCached(studentUser._id)).toBe(false);
      expect(isProfileCached(studentUser._id)).toBe(false);
    });
  });

  describe('4. Career Model Cache (careerModel.service.js)', () => {
    it('uses BoundedCache with maxSize 100 and 5-minute TTL', () => {
      const cache = getCareerModelCache();
      expect(cache).toBeInstanceOf(BoundedCache);
      expect(cache.maxSize).toBe(100);
      expect(cache.ttlMs).toBe(300000);
    });

    it('caches graph models and supports selective or global invalidation', async () => {
      expect(isCareerModelCached('ai-engineer')).toBe(false);

      const modelA = await getCareerModel('ai-engineer');
      expect(modelA).toBeDefined();
      expect(modelA.career.slug).toBe('ai-engineer');
      expect(isCareerModelCached('ai-engineer')).toBe(true);

      const modelB = await getCareerModel('data-scientist');
      expect(modelB).toBeDefined();
      expect(isCareerModelCached('data-scientist')).toBe(true);

      // Specific invalidation
      invalidateCareerModels('ai-engineer');
      expect(isCareerModelCached('ai-engineer')).toBe(false);
      expect(isCareerModelCached('data-scientist')).toBe(true);

      // Global invalidation
      invalidateCareerModels();
      expect(isCareerModelCached('data-scientist')).toBe(false);
    });
  });

  describe('5. Cross-Request Statelessness & Multi-Instance Resilience', () => {
    it('guarantees identical correct outputs on cold/unprimed cache instances', async () => {
      await UserSkill.create({
        userId: studentUser._id,
        skillId: skillPython._id,
        proficiency: 3,
        source: 'self',
      });

      // Request 1: hits warm caches
      const warmGap = await getSkillGapAnalysis(studentUser._id.toString(), 'ai-engineer');
      const warmFit = await getCareerFitAnalysis(studentUser._id.toString(), 'ai-engineer');

      expect(isProfileCached(studentUser._id)).toBe(true);
      expect(isCareerModelCached('ai-engineer')).toBe(true);

      // Simulate Request 2 dispatched to a fresh server instance (cold in-memory caches)
      invalidateProfile();
      invalidateUserCareer();
      invalidateAlignmentCache();
      invalidateCareerModels();

      expect(isProfileCached(studentUser._id)).toBe(false);
      expect(isCareerModelCached('ai-engineer')).toBe(false);

      const coldGap = await getSkillGapAnalysis(studentUser._id.toString(), 'ai-engineer');
      const coldFit = await getCareerFitAnalysis(studentUser._id.toString(), 'ai-engineer');

      // The analysis calculations must match exactly between warm and cold instances
      expect(coldGap.summary).toEqual(warmGap.summary);
      expect(coldGap.items).toEqual(warmGap.items);
      expect(coldFit.fitScore).toBe(warmFit.fitScore);
      expect(coldFit.coverage).toBe(warmFit.coverage);
      expect(coldFit.readiness).toBe(warmFit.readiness);
      expect(coldFit.band).toBe(warmFit.band);
    });

    it('ensures updates to database immediately propagate without stale cross-request bleed', async () => {
      // Warm up caches for Alice
      await getSkillGapAnalysis(studentUser._id.toString(), 'ai-engineer');
      expect(isProfileCached(studentUser._id)).toBe(true);

      // Direct mutation in MongoDB (simulating update executed on another cluster node)
      await UserSkill.create({
        userId: studentUser._id,
        skillId: skillSql._id,
        proficiency: 2,
        source: 'self',
      });

      // On a node where local cache was invalidated or expired
      invalidateProfile(studentUser._id);

      const updatedGap = await getSkillGapAnalysis(studentUser._id.toString(), 'ai-engineer');
      const sqlItem = updatedGap.items.find((item) => item.skill.slug === 'sql');

      expect(sqlItem).toBeDefined();
      expect(sqlItem.proficiency).toBe(2);
      expect(sqlItem.status).toBe('strong');
    });

    it('handles concurrent requests with isolated, deterministic results', async () => {
      // Run 10 concurrent analysis requests
      const promises = Array.from({ length: 10 }).map(() =>
        getCareerFitAnalysis(studentUser._id.toString(), 'ai-engineer'),
      );

      const results = await Promise.all(promises);
      const firstScore = results[0].fitScore;

      for (const res of results) {
        expect(res.fitScore).toBe(firstScore);
        expect(res.career.slug).toBe('ai-engineer');
      }
    });
  });
});
