import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/user.model.js';
import { Career } from '../src/models/career.model.js';
import { Skill } from '../src/models/skill.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import { UserProgress } from '../src/models/userProgress.model.js';
import { AlignmentSnapshot } from '../src/models/alignmentSnapshot.model.js';
import {
  putSkills,
  patchSkill,
  supportsTransactions,
  resetTransactionSupportCache,
} from '../src/services/userSkills.service.js';
import {
  getProfileMap,
  isProfileCached,
  invalidateProfile,
} from '../src/services/profile.service.js';
import {
  invalidateAlignmentCache,
  isAlignmentCached,
  cacheAlignment,
} from '../src/services/alignment.service.js';
import { invalidateCareerModels } from '../src/services/careerModel.service.js';

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
    // Ignore cleanup
  }
});

describe('Skill Update Flow - Failure Injection & Safe Rollback', () => {
  let userA = null;
  let userB = null;
  let testCareer = null;
  let pythonSkill = null;
  let sqlSkill = null;
  let dockerSkill = null;

  beforeEach(async () => {
    vi.restoreAllMocks();
    delete process.env.FORCE_TRANSACTIONS;
    resetTransactionSupportCache();
    invalidateProfile();
    invalidateAlignmentCache();
    invalidateCareerModels();

    await Promise.all([
      User.deleteMany({}),
      Career.deleteMany({}),
      Skill.deleteMany({}),
      CareerSkill.deleteMany({}),
      UserSkill.deleteMany({}),
      UserProgress.deleteMany({}),
      AlignmentSnapshot.deleteMany({}),
    ]);

    // Create test career
    testCareer = await Career.create({
      slug: 'machine-learning-engineer',
      name: 'ML Engineer',
      description: 'Machine Learning Engineering',
      category: 'ai',
      icon: 'brain',
      isActive: true,
    });

    // Create test skills
    pythonSkill = await Skill.create({
      slug: 'python',
      name: 'Python',
      description: 'Python language',
      category: 'programming',
      difficulty: 2,
    });

    sqlSkill = await Skill.create({
      slug: 'sql',
      name: 'SQL',
      description: 'SQL database',
      category: 'database',
      difficulty: 2,
    });

    dockerSkill = await Skill.create({
      slug: 'docker',
      name: 'Docker',
      description: 'Containers',
      category: 'devops',
      difficulty: 2,
    });

    // Career skills mapping
    await CareerSkill.create([
      { careerId: testCareer._id, skillId: pythonSkill._id, requiredLevel: 3, importance: 1.0 },
      { careerId: testCareer._id, skillId: sqlSkill._id, requiredLevel: 2, importance: 0.8 },
      { careerId: testCareer._id, skillId: dockerSkill._id, requiredLevel: 2, importance: 0.5 },
    ]);

    // Create test users
    userA = await User.create({
      name: 'Student A',
      email: 'student_a@example.com',
      passwordHash: 'hashed_password_a',
      role: 'student',
      targetCareerId: testCareer._id,
    });

    userB = await User.create({
      name: 'Student B',
      email: 'student_b@example.com',
      passwordHash: 'hashed_password_b',
      role: 'student',
      targetCareerId: testCareer._id,
    });
  });

  describe('1. Topology Support & Overrides', () => {
    it('detects standalone mongo topology as non-transactional by default', async () => {
      const supported = await supportsTransactions();
      expect(supported).toBe(false);
    });

    it('respects FORCE_TRANSACTIONS=true override', async () => {
      process.env.FORCE_TRANSACTIONS = 'true';
      expect(await supportsTransactions()).toBe(true);
    });

    it('respects FORCE_TRANSACTIONS=false override', async () => {
      process.env.FORCE_TRANSACTIONS = 'false';
      expect(await supportsTransactions()).toBe(false);
    });
  });

  describe('2. patchSkill Compensating Recovery (Non-transactional Topology)', () => {
    beforeEach(async () => {
      // Seed User A with python level 1, 1 initial progress entry, 1 initial alignment snapshot
      await UserSkill.create({
        userId: userA._id,
        skillId: pythonSkill._id,
        proficiency: 1,
        source: 'self',
      });

      await UserProgress.create({
        userId: userA._id,
        skillId: pythonSkill._id,
        previousLevel: 0,
        currentLevel: 1,
      });

      await AlignmentSnapshot.create({
        userId: userA._id,
        careerId: testCareer._id,
        fitScore: 20,
        coverage: 0.33,
        readiness: 0.2,
        trigger: 'onboarding',
        createdAt: new Date(Date.now() - 120 * 1000), // 2 minutes ago
      });
    });

    it('rolls back UserSkill, UserProgress, and Snapshot when failing at after_skills', async () => {
      const priorSkills = await UserSkill.find({ userId: userA._id }).lean();
      const priorProgress = await UserProgress.find({ userId: userA._id }).lean();
      const priorSnapshots = await AlignmentSnapshot.find({ userId: userA._id }).lean();

      await expect(
        patchSkill(userA._id, 'python', 3, { failAt: 'after_skills', forceTransactionMode: false }),
      ).rejects.toThrow('after_skills');

      const afterSkills = await UserSkill.find({ userId: userA._id }).lean();
      const afterProgress = await UserProgress.find({ userId: userA._id }).lean();
      const afterSnapshots = await AlignmentSnapshot.find({ userId: userA._id }).lean();

      expect(afterSkills).toHaveLength(priorSkills.length);
      expect(afterSkills[0].proficiency).toBe(1); // Not left at 3!
      expect(afterProgress).toHaveLength(priorProgress.length); // No dangling progress row!
      expect(afterSnapshots).toHaveLength(priorSnapshots.length);
      expect(afterSnapshots[0].fitScore).toBe(20);
    });

    it('rolls back UserSkill and deletes inserted progress row when failing at after_progress', async () => {
      await expect(
        patchSkill(userA._id, 'python', 3, { failAt: 'after_progress', forceTransactionMode: false }),
      ).rejects.toThrow('after_progress');

      const afterSkills = await UserSkill.find({ userId: userA._id }).lean();
      const afterProgress = await UserProgress.find({ userId: userA._id }).lean();
      const afterSnapshots = await AlignmentSnapshot.find({ userId: userA._id }).lean();

      expect(afterSkills).toHaveLength(1);
      expect(afterSkills[0].proficiency).toBe(1);
      expect(afterProgress).toHaveLength(1); // The level 1->3 progress row was completely cleaned up
      expect(afterProgress[0].currentLevel).toBe(1);
      expect(afterSnapshots).toHaveLength(1);
      expect(afterSnapshots[0].fitScore).toBe(20);
    });

    it('rolls back UserSkill and UserProgress when failing inside recordSnapshot (in_snapshot)', async () => {
      await expect(
        patchSkill(userA._id, 'python', 3, { failAt: 'in_snapshot', forceTransactionMode: false }),
      ).rejects.toThrow('in_snapshot');

      const afterSkills = await UserSkill.find({ userId: userA._id }).lean();
      const afterProgress = await UserProgress.find({ userId: userA._id }).lean();
      const afterSnapshots = await AlignmentSnapshot.find({ userId: userA._id }).lean();

      expect(afterSkills[0].proficiency).toBe(1);
      expect(afterProgress).toHaveLength(1);
      expect(afterSnapshots).toHaveLength(1);
      expect(afterSnapshots[0].fitScore).toBe(20);
    });

    it('deletes newly created skill document if failure occurs when acquiring a new skill', async () => {
      // User A doesn't have sqlSkill yet (level 0)
      await expect(
        patchSkill(userA._id, 'sql', 2, { failAt: 'after_progress', forceTransactionMode: false }),
      ).rejects.toThrow('after_progress');

      const sqlDoc = await UserSkill.findOne({ userId: userA._id, skillId: sqlSkill._id });
      expect(sqlDoc).toBeNull(); // Cleanly deleted, not left behind!

      const progressSql = await UserProgress.findOne({ userId: userA._id, skillId: sqlSkill._id });
      expect(progressSql).toBeNull();
    });

    it('restores deleted skill document if failure occurs when removing a skill to level 0', async () => {
      // User A removes python (currentLevel = 0)
      await expect(
        patchSkill(userA._id, 'python', 0, { failAt: 'in_snapshot', forceTransactionMode: false }),
      ).rejects.toThrow('in_snapshot');

      const pythonDoc = await UserSkill.findOne({ userId: userA._id, skillId: pythonSkill._id });
      expect(pythonDoc).not.toBeNull();
      expect(pythonDoc.proficiency).toBe(1); // Restored to level 1!
    });
  });

  describe('3. putSkills Compensating Recovery (Bulk Replace)', () => {
    beforeEach(async () => {
      // Seed user with python=2 and sql=1
      await UserSkill.create([
        { userId: userA._id, skillId: pythonSkill._id, proficiency: 2, source: 'self' },
        { userId: userA._id, skillId: sqlSkill._id, proficiency: 1, source: 'self' },
      ]);
      await UserProgress.create([
        { userId: userA._id, skillId: pythonSkill._id, previousLevel: 0, currentLevel: 2 },
        { userId: userA._id, skillId: sqlSkill._id, previousLevel: 0, currentLevel: 1 },
      ]);
      await AlignmentSnapshot.create({
        userId: userA._id,
        careerId: testCareer._id,
        fitScore: 35,
        coverage: 0.66,
        readiness: 0.3,
        trigger: 'skills_update',
        createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      });
    });

    it('reverts all bulk changes when failing at after_skills', async () => {
      // Incoming: python=3 (updated), sql=0 (removed), docker=2 (created)
      const replacement = [
        { skillSlug: 'python', proficiency: 3 },
        { skillSlug: 'sql', proficiency: 0 },
        { skillSlug: 'docker', proficiency: 2 },
      ];

      await expect(
        putSkills(userA._id, replacement, { failAt: 'after_skills', forceTransactionMode: false }),
      ).rejects.toThrow('after_skills');

      const afterSkills = await UserSkill.find({ userId: userA._id }).lean();
      const pythonDoc = afterSkills.find((s) => s.skillId.toString() === pythonSkill._id.toString());
      const sqlDoc = afterSkills.find((s) => s.skillId.toString() === sqlSkill._id.toString());
      const dockerDoc = afterSkills.find((s) => s.skillId.toString() === dockerSkill._id.toString());

      expect(pythonDoc?.proficiency).toBe(2); // Restored to 2
      expect(sqlDoc?.proficiency).toBe(1); // Not deleted!
      expect(dockerDoc).toBeUndefined(); // Not created!
      expect(await UserProgress.countDocuments({ userId: userA._id })).toBe(2);
      expect(await AlignmentSnapshot.countDocuments({ userId: userA._id })).toBe(1);
    });

    it('reverts all bulk changes when failing at after_progress', async () => {
      const replacement = [
        { skillSlug: 'python', proficiency: 4 },
        { skillSlug: 'docker', proficiency: 2 },
      ];

      await expect(
        putSkills(userA._id, replacement, { failAt: 'after_progress', forceTransactionMode: false }),
      ).rejects.toThrow('after_progress');

      const afterSkills = await UserSkill.find({ userId: userA._id }).lean();
      const progressDocs = await UserProgress.find({ userId: userA._id }).lean();

      expect(afterSkills).toHaveLength(2); // Original 2 skills restored
      expect(progressDocs).toHaveLength(2); // Newly inserted progress rows cleanly purged
    });

    it('reverts in-place snapshot update when failing inside recordSnapshot', async () => {
      const priorSnapshot = await AlignmentSnapshot.findOne({ userId: userA._id }).lean();

      const replacement = [{ skillSlug: 'python', proficiency: 4 }];

      await expect(
        putSkills(userA._id, replacement, { failAt: 'in_snapshot', forceTransactionMode: false }),
      ).rejects.toThrow('in_snapshot');

      const afterSnapshot = await AlignmentSnapshot.findOne({ userId: userA._id }).lean();
      expect(afterSnapshot.fitScore).toBe(priorSnapshot.fitScore);
      expect(afterSnapshot.coverage).toBe(priorSnapshot.coverage);
      expect(afterSnapshot.readiness).toBe(priorSnapshot.readiness);
    });
  });

  describe('4. Transaction Mode Atomic Execution & Rollback', () => {
    it('aborts transaction and cleans session on failure when transaction mode is forced', async () => {
      // Seed user
      await UserSkill.create({
        userId: userA._id,
        skillId: pythonSkill._id,
        proficiency: 1,
        source: 'self',
      });

      let withTransactionCalled = false;
      let sessionEnded = false;

      const realSession = await mongoose.startSession();
      vi.spyOn(mongoose, 'startSession').mockResolvedValue(realSession);
      vi.spyOn(realSession, 'withTransaction').mockImplementation(async (fn) => {
        withTransactionCalled = true;
        return await fn();
      });
      const origEnd = realSession.endSession.bind(realSession);
      vi.spyOn(realSession, 'endSession').mockImplementation(async () => {
        sessionEnded = true;
        return origEnd();
      });

      await expect(
        patchSkill(userA._id, 'python', 3, {
          failAt: 'after_skills',
          forceTransactionMode: true,
        }),
      ).rejects.toThrow('after_skills');

      expect(withTransactionCalled).toBe(true);
      expect(sessionEnded).toBe(true);
    });
  });

  describe('5. Profile & Alignment Cache Invalidation', () => {
    beforeEach(async () => {
      await UserSkill.create({
        userId: userA._id,
        skillId: pythonSkill._id,
        proficiency: 1,
        source: 'self',
      });
    });

    it('invalidates profile cache and updates alignment cache on SUCCESSFUL update', async () => {
      // 1. Populate profile cache
      const cachedBefore = await getProfileMap(userA._id, { useCache: true });
      expect(cachedBefore).toEqual({ python: 1 });
      expect(isProfileCached(userA._id)).toBe(true);

      // 2. Perform successful skill update
      await patchSkill(userA._id, 'python', 2, { forceTransactionMode: false });

      // 3. Cache must be invalidated immediately
      expect(isProfileCached(userA._id)).toBe(false);

      // 4. Fresh read fetches updated profile
      const freshProfile = await getProfileMap(userA._id, { useCache: true });
      expect(freshProfile).toEqual({ python: 2 });
    });

    it('invalidates profile and alignment caches on FAILED update / rollback', async () => {
      // 1. Populate both caches
      await getProfileMap(userA._id, { useCache: true });
      cacheAlignment(userA._id, { score: 20 });

      expect(isProfileCached(userA._id)).toBe(true);
      expect(isAlignmentCached(userA._id)).toBe(true);

      // 2. Perform failed update with rollback
      await expect(
        patchSkill(userA._id, 'python', 3, {
          failAt: 'after_skills',
          forceTransactionMode: false,
        }),
      ).rejects.toThrow('after_skills');

      // 3. Both caches must be invalidated so no dirty in-flight state persists
      expect(isProfileCached(userA._id)).toBe(false);
      expect(isAlignmentCached(userA._id)).toBe(false);

      // 4. Subsequent read returns the reverted state (1, not dirty 3)
      const readAfter = await getProfileMap(userA._id, { useCache: true });
      expect(readAfter).toEqual({ python: 1 });
    });
  });

  describe('6. Multi-User Isolation During Rollback', () => {
    it('ensures User A failure rollback does not mutate User B skills or history', async () => {
      // Seed User B with sql level 3
      await UserSkill.create({
        userId: userB._id,
        skillId: sqlSkill._id,
        proficiency: 3,
        source: 'self',
      });
      await UserProgress.create({
        userId: userB._id,
        skillId: sqlSkill._id,
        previousLevel: 0,
        currentLevel: 3,
      });

      // User A performs failed update
      await expect(
        putSkills(userA._id, [{ skillSlug: 'sql', proficiency: 2 }], {
          failAt: 'after_progress',
          forceTransactionMode: false,
        }),
      ).rejects.toThrow('after_progress');

      // User B must remain completely untouched
      const userBSkills = await UserSkill.find({ userId: userB._id }).lean();
      const userBProgress = await UserProgress.find({ userId: userB._id }).lean();

      expect(userBSkills).toHaveLength(1);
      expect(userBSkills[0].proficiency).toBe(3);
      expect(userBProgress).toHaveLength(1);
      expect(userBProgress[0].currentLevel).toBe(3);
    });
  });
});
