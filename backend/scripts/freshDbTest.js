// backend/scripts/freshDbTest.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { SkillRelationship } from '../src/models/skillRelationship.model.js';
import { Career } from '../src/models/career.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import { AlignmentSnapshot } from '../src/models/alignmentSnapshot.model.js';
import { UserProgress } from '../src/models/userProgress.model.js';
import { ChatMessage } from '../src/models/chatMessage.model.js';

dotenv.config({ override: true });

async function getCollectionCounts() {
  const [
    users,
    skills,
    skillRelationships,
    careers,
    careerSkills,
    userSkills,
    alignmentSnapshots,
    userProgresses,
  ] = await Promise.all([
    User.countDocuments(),
    Skill.countDocuments(),
    SkillRelationship.countDocuments(),
    Career.countDocuments(),
    CareerSkill.countDocuments(),
    UserSkill.countDocuments(),
    AlignmentSnapshot.countDocuments(),
    UserProgress.countDocuments(),
  ]);

  return {
    users,
    skills,
    skillRelationships,
    careers,
    careerSkills,
    userSkills,
    alignmentSnapshots,
    userProgresses,
  };
}

async function run() {
  console.log('--- Step 3: Fresh Database Test & Idempotence Verification ---');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  console.log('Clearing all collections for fresh database test...');
  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    SkillRelationship.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    UserSkill.deleteMany({}),
    AlignmentSnapshot.deleteMany({}),
    UserProgress.deleteMany({}),
    ChatMessage.deleteMany({}),
  ]);
  console.log('All collections cleared.');

  console.log('\nRunning First Seed Pass (npm run seed && npm run seed:demo)...');
  execSync('npm run seed', { cwd: process.cwd(), stdio: 'inherit' });
  execSync('npm run seed:demo', { cwd: process.cwd(), stdio: 'inherit' });

  const firstCounts = await getCollectionCounts();
  console.log('\nCounts after First Pass:');
  console.table(firstCounts);

  console.log('\nRunning Second Seed Pass to test Idempotence (npm run seed && npm run seed:demo)...');
  execSync('npm run seed', { cwd: process.cwd(), stdio: 'inherit' });
  execSync('npm run seed:demo', { cwd: process.cwd(), stdio: 'inherit' });

  const secondCounts = await getCollectionCounts();
  console.log('\nCounts after Second Pass:');
  console.table(secondCounts);

  let isIdempotent = true;
  for (const key of Object.keys(firstCounts)) {
    if (firstCounts[key] !== secondCounts[key]) {
      console.error(`IDEMPOTENCE MISMATCH: ${key} changed from ${firstCounts[key]} to ${secondCounts[key]}`);
      isIdempotent = false;
    }
  }

  if (isIdempotent) {
    console.log('\nSUCCESS: Database seeding is 100% IDEMPOTENT. All collection counts remained identical!');
  } else {
    console.error('\nFAIL: Seeding is NOT idempotent!');
    process.exit(1);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal error in freshDbTest:', err);
  process.exit(1);
});
