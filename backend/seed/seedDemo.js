import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getCareerModel } from '../src/services/careerModel.service.js';
import { computeFit } from '../src/services/engine/fit.js';

/**
 * Seed demo persona users, their skills, and alignment snapshots.
 * Idempotent: can be run repeatedly without duplicating data.
 *
 * @param {Object} params
 * @param {Object} params.models - Mongoose models
 * @param {string} [params.seedDir] - Directory containing demo-users.json
 * @param {Object} [params.options]
 * @returns {Promise<Object>} Summary of created and updated records
 */
export async function seedDemoUsers({ models, seedDir, options = {} }) {
  const { User, Career, Skill, UserSkill, AlignmentSnapshot } = models;

  let dir = seedDir || process.env.SEED_DIR;
  if (!dir) {
    const candidateUp = path.resolve(process.cwd(), '../shared/seed');
    const candidateHere = path.resolve(process.cwd(), 'shared/seed');
    dir = fs.existsSync(candidateUp) ? candidateUp : candidateHere;
  }

  const demoUsersPath = path.join(dir, 'demo-users.json');
  if (!fs.existsSync(demoUsersPath)) {
    throw new Error(`Demo users file not found at: ${demoUsersPath}`);
  }

  const demoUsers = JSON.parse(fs.readFileSync(demoUsersPath, 'utf8'));

  const demoPassword = options.demoPassword || process.env.DEMO_PASSWORD || 'DemoStudent123!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const careers = await Career.find({});
  const careerMap = new Map(careers.map((c) => [c.slug, c._id]));

  const skills = await Skill.find({});
  const skillMap = new Map(skills.map((s) => [s.slug, s._id]));

  const summary = {
    usersCreated: 0,
    usersUpdated: 0,
    userSkillsSet: 0,
    snapshotsCreated: 0,
  };

  const now = Date.now();

  for (const demo of demoUsers) {
    const targetCareerId = demo.targetCareer ? careerMap.get(demo.targetCareer) || null : null;

    let user = await User.findOne({ email: demo.email });
    if (!user) {
      user = await User.create({
        name: demo.name,
        email: demo.email,
        passwordHash,
        role: 'student',
        college: demo.college || 'Engineering College',
        degree: demo.degree || 'B.Tech',
        branch: demo.branch || 'CSE',
        semester: demo.semester || 1,
        targetCareerId,
        onboardingCompleted: Boolean(demo.onboardingCompleted),
      });
      summary.usersCreated++;
    } else {
      user.name = demo.name;
      user.college = demo.college || user.college;
      user.degree = demo.degree || user.degree;
      user.branch = demo.branch || user.branch;
      user.semester = demo.semester || user.semester;
      user.targetCareerId = targetCareerId;
      user.onboardingCompleted = Boolean(demo.onboardingCompleted);
      await user.save();
      summary.usersUpdated++;
    }

    // Upsert user skills
    const userSkillEntries = Object.entries(demo.skills || {});
    const targetSkillIds = [];

    for (const [skillSlug, level] of userSkillEntries) {
      const skillId = skillMap.get(skillSlug);
      if (skillId && typeof level === 'number' && level > 0) {
        targetSkillIds.push(skillId);
        await UserSkill.findOneAndUpdate(
          { userId: user._id, skillId },
          { $set: { proficiency: level, source: 'self' } },
          { upsert: true, returnDocument: 'after' },
        );
        summary.userSkillsSet++;
      }
    }

    // Remove any skills not present in the persona
    await UserSkill.deleteMany({
      userId: user._id,
      skillId: { $nin: targetSkillIds },
    });

    // Seed alignment snapshots for users with a target career
    if (targetCareerId && demo.targetCareer) {
      // Clear existing snapshots for idempotent re-runs
      await AlignmentSnapshot.deleteMany({ userId: user._id });

      // 1. Older snapshots from alignmentHistory
      for (const history of demo.alignmentHistory || []) {
        const createdAt = new Date(now - history.daysAgo * 24 * 60 * 60 * 1000);
        const coverage = Math.min(1, Math.max(0, history.fitScore / 100));
        const readiness = Math.min(1, Math.max(0, history.fitScore / 100));
        const trigger = history.daysAgo >= 14 ? 'onboarding' : 'skills_update';

        await AlignmentSnapshot.create({
          userId: user._id,
          careerId: targetCareerId,
          fitScore: history.fitScore,
          coverage,
          readiness,
          trigger,
          createdAt,
        });
        summary.snapshotsCreated++;
      }

      // 2. Current snapshot computed by engine
      const { model } = await getCareerModel(demo.targetCareer);
      const fit = computeFit(model, demo.skills || {});

      await AlignmentSnapshot.create({
        userId: user._id,
        careerId: targetCareerId,
        fitScore: fit.fitScore,
        coverage: fit.coverage,
        readiness: fit.readiness,
        trigger: 'skills_update',
        createdAt: new Date(now),
      });
      summary.snapshotsCreated++;
    }
  }

  return summary;
}

/**
 * CLI wrapper for running seedDemo standalone.
 */
async function runCli() {
  const { config: loadDotenv } = await import('dotenv');
  loadDotenv();

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    // eslint-disable-next-line no-console
    console.error('Error: MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  const models = await import('../src/models/index.js');

  try {
    // eslint-disable-next-line no-console
    console.log('Connecting to MongoDB for demo seeding...');
    await mongoose.connect(mongoUri);

    const summary = await seedDemoUsers({ models });

    // eslint-disable-next-line no-console
    console.log('\n--- Demo Seeding Summary ---');
    // eslint-disable-next-line no-console
    console.table(summary);
    // eslint-disable-next-line no-console
    console.log('Demo personas seeded successfully.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('\nDemo seeding failed:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runCli();
}

export default seedDemoUsers;
