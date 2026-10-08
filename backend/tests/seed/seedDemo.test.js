import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as models from '../../src/models/index.js';
import { seedKnowledgeBase } from '../../seed/seed.js';
import { seedDemoUsers } from '../../seed/seedDemo.js';
import { loadSeedFiles } from '../../seed/loadSeedFiles.js';

const { Skill, SkillRelationship, Career, CareerSkill, User, UserSkill, AlignmentSnapshot } = models;

let mongoServer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  // Clear collections
  await Promise.all([
    Skill.deleteMany({}),
    SkillRelationship.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    User.deleteMany({}),
    UserSkill.deleteMany({}),
    AlignmentSnapshot.deleteMany({}),
  ]);

  // Seed base knowledge base first
  const realSeed = loadSeedFiles();
  await seedKnowledgeBase({
    models,
    data: realSeed,
  });
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
      AlignmentSnapshot.deleteMany({}),
    ]);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe('Demo Persona Seeder (seedDemoUsers)', () => {
  it('seeds demo personas, userSkills, and snapshots idempotently', async () => {
    // Run 1: On empty user database
    const summary1 = await seedDemoUsers({ models });
    expect(summary1.usersCreated).toBe(4); // prabha, asha, ravi, newbie
    expect(summary1.userSkillsSet).toBeGreaterThan(0);
    expect(summary1.snapshotsCreated).toBeGreaterThan(0);

    const userCount1 = await User.countDocuments({ email: /@demo\.skillgraph\.dev$/ });
    expect(userCount1).toBe(4);

    const prabha = await User.findOne({ email: 'prabha@demo.skillgraph.dev' });
    expect(prabha).toBeDefined();
    expect(prabha.role).toBe('student');
    expect(prabha.targetCareerId).toBeDefined();

    // Verify snapshots for prabha: 2 historical + 1 current = 3 snapshots
    const prabhaSnapshots = await AlignmentSnapshot.find({ userId: prabha._id }).sort({ createdAt: 1 });
    expect(prabhaSnapshots.length).toBe(3);
    expect(prabhaSnapshots[0].fitScore).toBe(12);
    expect(prabhaSnapshots[1].fitScore).toBe(19);
    // Current snapshot computed by engine should be >= 19
    expect(prabhaSnapshots[2].fitScore).toBeGreaterThanOrEqual(19);

    // Verify newbie has no target career and 0 snapshots
    const newbie = await User.findOne({ email: 'newbie@demo.skillgraph.dev' });
    expect(newbie).toBeDefined();
    expect(newbie.targetCareerId).toBeNull();
    const newbieSnapshots = await AlignmentSnapshot.find({ userId: newbie._id });
    expect(newbieSnapshots.length).toBe(0);

    // Run 2: Re-run on already filled database (idempotency check)
    const summary2 = await seedDemoUsers({ models });
    expect(summary2.usersCreated).toBe(0);
    expect(summary2.usersUpdated).toBe(4);

    const userCount2 = await User.countDocuments({ email: /@demo\.skillgraph\.dev$/ });
    expect(userCount2).toBe(4);

    const prabhaSnapshotsAfter = await AlignmentSnapshot.find({ userId: prabha._id });
    expect(prabhaSnapshotsAfter.length).toBe(3);
  });
});
