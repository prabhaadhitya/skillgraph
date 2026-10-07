import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import * as models from '../../src/models/index.js';
import { seedKnowledgeBase } from '../../seed/seed.js';
import { loadSeedFiles } from '../../seed/loadSeedFiles.js';

const { Skill, SkillRelationship, Career, CareerSkill, User, UserSkill } = models;

let mongoServer = null;

beforeAll(async () => {
  const testUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/skillgraph_test_seed';
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
  } catch {
    mongoServer = await MongoMemoryServer.create({
      spawn: { timeout: 30000 },
    });
    await mongoose.connect(mongoServer.getUri());
  }

  // Clear test DB
  await Promise.all([
    Skill.deleteMany({}),
    SkillRelationship.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    User.deleteMany({}),
    UserSkill.deleteMany({}),
  ]);
});

afterAll(async () => {
  try {
    await Promise.all([
      Skill.deleteMany({}),
      SkillRelationship.deleteMany({}),
      Career.deleteMany({}),
      CareerSkill.deleteMany({}),
      User.deleteMany({}),
      UserSkill.deleteMany({}),
    ]);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors during shutdown
  }
});

describe('Knowledge Base Seeder (seedKnowledgeBase)', () => {
  const realSeed = loadSeedFiles();

  it('seeding the real files gives 71 skills, 101 relationships, 5 careers, 134 careerSkills', async () => {
    const summary = await seedKnowledgeBase({
      models,
      data: realSeed,
      options: {
        adminEmail: 'admin@skillgraph.dev',
        adminPassword: 'SuperSecurePassword123!',
      },
    });

    expect(summary.skills.created).toBe(71);
    expect(summary.skills.deleted).toBe(0);
    expect(summary.relationships.created).toBe(101);
    expect(summary.relationships.deleted).toBe(0);
    expect(summary.careers.created).toBe(5);
    expect(summary.careers.deleted).toBe(0);
    expect(summary.careerSkills.created).toBe(134);
    expect(summary.careerSkills.deleted).toBe(0);

    expect(await Skill.countDocuments()).toBe(71);
    expect(await SkillRelationship.countDocuments()).toBe(101);
    expect(await Career.countDocuments()).toBe(5);
    expect(await CareerSkill.countDocuments()).toBe(134);
  });

  it('running the seed twice gives the same counts and the SAME _id for a given slug', async () => {
    const pythonBefore = await Skill.findOne({ slug: 'python' }).lean();
    const mlCareerBefore = await Career.findOne({ slug: 'machine-learning-engineer' }).lean();

    expect(pythonBefore).not.toBeNull();
    expect(mlCareerBefore).not.toBeNull();

    const summary2 = await seedKnowledgeBase({
      models,
      data: realSeed,
      options: {
        adminEmail: 'admin@skillgraph.dev',
        adminPassword: 'SuperSecurePassword123!',
      },
    });

    expect(summary2.skills.created).toBe(0);
    expect(summary2.skills.updated).toBe(0);
    expect(summary2.skills.unchanged).toBe(71);

    expect(summary2.careers.created).toBe(0);
    expect(summary2.careers.updated).toBe(0);
    expect(summary2.careers.unchanged).toBe(5);

    expect(summary2.relationships.created).toBe(0);
    expect(summary2.relationships.updated).toBe(0);
    expect(summary2.relationships.unchanged).toBe(101);

    expect(summary2.careerSkills.created).toBe(0);
    expect(summary2.careerSkills.updated).toBe(0);
    expect(summary2.careerSkills.unchanged).toBe(134);

    const pythonAfter = await Skill.findOne({ slug: 'python' }).lean();
    const mlCareerAfter = await Career.findOne({ slug: 'machine-learning-engineer' }).lean();

    expect(String(pythonAfter._id)).toBe(String(pythonBefore._id));
    expect(String(mlCareerAfter._id)).toBe(String(mlCareerBefore._id));
  });

  it('a RELATED_TO document always has source id < target id', async () => {
    const relatedDocs = await SkillRelationship.find({ relationshipType: 'RELATED_TO' }).lean();
    expect(relatedDocs.length).toBeGreaterThan(0);

    for (const doc of relatedDocs) {
      const sourceStr = String(doc.sourceSkillId);
      const targetStr = String(doc.targetSkillId);
      expect(sourceStr < targetStr).toBe(true);
    }
  });

  it('removing one career skill from a small inline dataset deletes the stale row on the next run', async () => {
    // Clear collections for clean inline dataset test
    await CareerSkill.deleteMany({});
    await SkillRelationship.deleteMany({});
    await Skill.deleteMany({});
    await Career.deleteMany({});

    const inlineData1 = {
      skills: [
        { slug: 'skill-alpha', name: 'Skill Alpha', category: 'tools', difficulty: 1 },
        { slug: 'skill-beta', name: 'Skill Beta', category: 'tools', difficulty: 2 },
      ],
      careers: [
        { slug: 'career-test', name: 'Career Test', category: 'software', icon: 'code', isActive: true },
      ],
      relationships: [],
      careerSkills: [
        { career: 'career-test', skill: 'skill-alpha', importance: 1.0, requiredLevel: 2 },
        { career: 'career-test', skill: 'skill-beta', importance: 0.8, requiredLevel: 3 },
      ],
    };

    // First run with 2 career skills
    const summary1 = await seedKnowledgeBase({ models, data: inlineData1 });
    expect(summary1.careerSkills.created).toBe(2);
    expect(await CareerSkill.countDocuments()).toBe(2);

    // Second run with only 1 career skill (skill-beta removed)
    const inlineData2 = {
      ...inlineData1,
      careerSkills: [
        { career: 'career-test', skill: 'skill-alpha', importance: 1.0, requiredLevel: 2 },
      ],
    };

    const summary2 = await seedKnowledgeBase({ models, data: inlineData2 });
    expect(summary2.careerSkills.deleted).toBe(1);
    expect(summary2.careerSkills.unchanged).toBe(1);
    expect(await CareerSkill.countDocuments()).toBe(1);

    const remainingSkill = await Skill.findOne({ slug: 'skill-alpha' }).lean();
    const remainingCs = await CareerSkill.findOne({}).lean();
    expect(String(remainingCs.skillId)).toBe(String(remainingSkill._id));
  });

  it('a duplicate-slug dataset aborts before writing', async () => {
    const countBefore = await Skill.countDocuments();

    const invalidData = {
      skills: [
        { slug: 'duplicate-slug', name: 'First', category: 'tools', difficulty: 1 },
        { slug: 'duplicate-slug', name: 'Second', category: 'tools', difficulty: 2 },
      ],
      careers: [],
      relationships: [],
      careerSkills: [],
    };

    await expect(seedKnowledgeBase({ models, data: invalidData })).rejects.toThrow(
      /Seed validation failed/,
    );

    // Collection was untouched
    expect(await Skill.countDocuments()).toBe(countBefore);
  });

  it('admin is created once and its password is not overwritten on the second run', async () => {
    await User.deleteMany({});

    const adminEmail = 'admin@skillgraph.dev';
    const firstPassword = 'FirstPassword123!';
    const secondPassword = 'DifferentPassword999!';

    // Run 1: admin created
    const summary1 = await seedKnowledgeBase({
      models,
      data: realSeed,
      options: { adminEmail, adminPassword: firstPassword },
    });
    expect(summary1.admin).toBe('created');

    const adminUser1 = await User.findOne({ email: adminEmail }).select('+passwordHash').lean();
    expect(adminUser1).not.toBeNull();
    expect(adminUser1.role).toBe('admin');
    expect(adminUser1.onboardingCompleted).toBe(true);

    const matchesFirst = await bcrypt.compare(firstPassword, adminUser1.passwordHash);
    expect(matchesFirst).toBe(true);

    // Run 2: admin already exists, should not overwrite password
    const summary2 = await seedKnowledgeBase({
      models,
      data: realSeed,
      options: { adminEmail, adminPassword: secondPassword },
    });
    expect(summary2.admin).toBe('unchanged');

    const adminUser2 = await User.findOne({ email: adminEmail }).select('+passwordHash').lean();
    expect(adminUser2.passwordHash).toBe(adminUser1.passwordHash);

    const stillMatchesFirst = await bcrypt.compare(firstPassword, adminUser2.passwordHash);
    expect(stillMatchesFirst).toBe(true);
    const doesNotMatchSecond = await bcrypt.compare(secondPassword, adminUser2.passwordHash);
    expect(doesNotMatchSecond).toBe(false);
  });

  it('--reset is refused when NODE_ENV=production and when userSkills exist', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      // 1. Refuse when NODE_ENV is production
      process.env.NODE_ENV = 'production';
      await expect(
        seedKnowledgeBase({ models, data: realSeed, options: { reset: true } }),
      ).rejects.toThrow(/NODE_ENV is "production"/);

      // Restore NODE_ENV
      process.env.NODE_ENV = 'test';

      // 2. Refuse when userSkills exist and --force is not given
      const dummySkill = await Skill.findOne({}).lean();
      const dummyUser = await User.findOne({}).lean();

      await UserSkill.create({
        userId: dummyUser._id,
        skillId: dummySkill._id,
        proficiency: 3,
      });

      await expect(
        seedKnowledgeBase({ models, data: realSeed, options: { reset: true, force: false } }),
      ).rejects.toThrow(/userSkills documents exist/);

      // 3. Succeeds when --force is given
      const resetSummary = await seedKnowledgeBase({
        models,
        data: realSeed,
        options: { reset: true, force: true },
      });
      expect(resetSummary.skills.created).toBe(71);
      expect(resetSummary.relationships.created).toBe(101);
      expect(resetSummary.careers.created).toBe(5);
      expect(resetSummary.careerSkills.created).toBe(134);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      await UserSkill.deleteMany({});
    }
  });
});
