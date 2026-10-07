import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { validateSeed } from './validate.js';
import { loadSeedFiles } from './loadSeedFiles.js';

/**
 * Loads the validated knowledge base into MongoDB safely and repeatably.
 *
 * @param {object} params
 * @param {object} params.models - Mongoose models { Skill, SkillRelationship, Career, CareerSkill, User, UserSkill }
 * @param {object} params.data - Parsed seed data { skills, relationships, careers, careerSkills }
 * @param {object} [params.options={}]
 * @param {boolean} [params.options.reset=false] - If true, clears the 4 knowledge base collections before seeding
 * @param {boolean} [params.options.force=false] - If true, bypasses userSkills check on reset
 * @param {string} [params.options.adminEmail] - Admin email (defaults to process.env.ADMIN_EMAIL)
 * @param {string} [params.options.adminPassword] - Admin password (defaults to process.env.ADMIN_PASSWORD)
 * @returns {Promise<object>} Summary of created, updated, deleted, and unchanged counts
 */
export async function seedKnowledgeBase({ models, data, options = {} }) {
  const { Skill, SkillRelationship, Career, CareerSkill, User, UserSkill } = models;

  // Step 1: Validate seed data before touching the database
  const { errors, warnings } = validateSeed(data);
  if (errors && errors.length > 0) {
    const errorMsg = `Seed validation failed with ${errors.length} error(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    const err = new Error(errorMsg);
    err.validationErrors = errors;
    err.validationWarnings = warnings;
    throw err;
  }

  // Handle optional reset
  if (options.reset) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refused to reset database: NODE_ENV is "production". Knowledge base reset is not permitted in production.',
      );
    }

    if (UserSkill) {
      const userSkillsCount = await UserSkill.countDocuments();
      if (userSkillsCount > 0 && !options.force) {
        throw new Error(
          `Refused to reset database: ${userSkillsCount} userSkills documents exist. Resetting changes ObjectIds and would break mappings. Pass --force to override.`,
        );
      }
    }

    // Delete ONLY the four knowledge-base collections
    await SkillRelationship.deleteMany({});
    await CareerSkill.deleteMany({});
    await Skill.deleteMany({});
    await Career.deleteMany({});
  }

  const now = new Date();

  // Step a: Upsert skills by slug (bulkWrite with upsert; keep existing _id)
  const skillOps = (data.skills || []).map((skill) => ({
    updateOne: {
      filter: { slug: skill.slug },
      update: {
        $set: {
          name: skill.name,
          description: skill.description || '',
          category: skill.category,
          difficulty: skill.difficulty,
        },
        $setOnInsert: { createdAt: now, updatedAt: now },
      },
      upsert: true,
    },
  }));
  const skillRes = skillOps.length > 0
    ? await Skill.bulkWrite(skillOps, { timestamps: false })
    : { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };

  // Step b: Upsert careers by slug
  const careerOps = (data.careers || []).map((career) => ({
    updateOne: {
      filter: { slug: career.slug },
      update: {
        $set: {
          name: career.name,
          description: career.description || '',
          category: career.category || 'software',
          icon: career.icon || 'code',
          isActive: career.isActive ?? true,
        },
        $setOnInsert: { createdAt: now, updatedAt: now },
      },
      upsert: true,
    },
  }));
  const careerRes = careerOps.length > 0
    ? await Career.bulkWrite(careerOps, { timestamps: false })
    : { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };

  // Step c: Build slug -> ObjectId maps
  const allSkills = await Skill.find({}, '_id slug').lean();
  const skillMap = new Map(allSkills.map((s) => [s.slug, s._id]));

  const allCareers = await Career.find({}, '_id slug').lean();
  const careerMap = new Map(allCareers.map((c) => [c.slug, c._id]));

  // Step d: Upsert skillRelationships by (sourceSkillId, targetSkillId, relationshipType)
  // For RELATED_TO store ONE document with String(sourceSkillId) < String(targetSkillId)
  const relOpsMap = new Map();
  for (const rel of data.relationships || []) {
    let sourceSkillId = skillMap.get(rel.source);
    let targetSkillId = skillMap.get(rel.target);
    if (!sourceSkillId || !targetSkillId) {
      throw new Error(`Referenced skill missing for relationship: ${rel.source} -> ${rel.target}`);
    }

    const relationshipType = rel.type;
    const strength = rel.strength ?? 1;

    if (relationshipType === 'RELATED_TO' && String(sourceSkillId) > String(targetSkillId)) {
      const temp = sourceSkillId;
      sourceSkillId = targetSkillId;
      targetSkillId = temp;
    }

    const key = `${sourceSkillId}:${targetSkillId}:${relationshipType}`;
    relOpsMap.set(key, {
      updateOne: {
        filter: { sourceSkillId, targetSkillId, relationshipType },
        update: {
          $set: { strength },
          $setOnInsert: { createdAt: now, updatedAt: now },
        },
        upsert: true,
      },
    });
  }
  const relOps = Array.from(relOpsMap.values());
  const relRes = relOps.length > 0
    ? await SkillRelationship.bulkWrite(relOps, { timestamps: false })
    : { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };

  // Step e: Upsert careerSkills by (careerId, skillId) with importance and requiredLevel
  const csOpsMap = new Map();
  for (const cs of data.careerSkills || []) {
    const careerId = careerMap.get(cs.career);
    const skillId = skillMap.get(cs.skill);
    if (!careerId || !skillId) {
      throw new Error(`Referenced career or skill missing for careerSkill: ${cs.career} / ${cs.skill}`);
    }

    const key = `${careerId}:${skillId}`;
    csOpsMap.set(key, {
      updateOne: {
        filter: { careerId, skillId },
        update: {
          $set: {
            importance: cs.importance,
            requiredLevel: cs.requiredLevel,
          },
          $setOnInsert: { createdAt: now, updatedAt: now },
        },
        upsert: true,
      },
    });
  }
  const csOps = Array.from(csOpsMap.values());
  const csRes = csOps.length > 0
    ? await CareerSkill.bulkWrite(csOps, { timestamps: false })
    : { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };

  // Step f: Delete stale rows (relationships and careerSkills in DB not in JSON)
  const activeRelKeys = new Set(relOpsMap.keys());
  const existingRels = await SkillRelationship.find(
    {},
    '_id sourceSkillId targetSkillId relationshipType',
  ).lean();
  const staleRelIds = existingRels
    .filter((r) => !activeRelKeys.has(`${r.sourceSkillId}:${r.targetSkillId}:${r.relationshipType}`))
    .map((r) => r._id);

  if (staleRelIds.length > 0) {
    await SkillRelationship.deleteMany({ _id: { $in: staleRelIds } });
  }

  const activeCsKeys = new Set(csOpsMap.keys());
  const existingCs = await CareerSkill.find({}, '_id careerId skillId').lean();
  const staleCsIds = existingCs
    .filter((cs) => !activeCsKeys.has(`${cs.careerId}:${cs.skillId}`))
    .map((cs) => cs._id);

  if (staleCsIds.length > 0) {
    await CareerSkill.deleteMany({ _id: { $in: staleCsIds } });
  }

  // Collect warnings for extra skills or careers in DB not present in JSON
  const extraWarnings = [];
  const jsonSkillSlugs = new Set((data.skills || []).map((s) => s.slug));
  const jsonCareerSlugs = new Set((data.careers || []).map((c) => c.slug));

  for (const s of allSkills) {
    if (!jsonSkillSlugs.has(s.slug)) {
      extraWarnings.push(`Database contains skill not in seed JSON: '${s.slug}'`);
    }
  }
  for (const c of allCareers) {
    if (!jsonCareerSlugs.has(c.slug)) {
      extraWarnings.push(`Database contains career not in seed JSON: '${c.slug}'`);
    }
  }

  // Step g: Create admin user if ADMIN_EMAIL & ADMIN_PASSWORD set and does not exist
  let adminStatus = 'skipped';
  const adminEmail = (options.adminEmail ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD;

  if (User && adminEmail && adminPassword) {
    const existingAdmin = await User.findOne({ email: adminEmail }).lean();
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        name: 'Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        onboardingCompleted: true,
      });
      adminStatus = 'created';
    } else {
      adminStatus = 'unchanged';
    }
  }

  // Step h: Return summary counts
  return {
    skills: {
      created: skillRes.upsertedCount || 0,
      updated: skillRes.modifiedCount || 0,
      deleted: 0,
      unchanged: (skillRes.matchedCount || 0) - (skillRes.modifiedCount || 0),
    },
    careers: {
      created: careerRes.upsertedCount || 0,
      updated: careerRes.modifiedCount || 0,
      deleted: 0,
      unchanged: (careerRes.matchedCount || 0) - (careerRes.modifiedCount || 0),
    },
    relationships: {
      created: relRes.upsertedCount || 0,
      updated: relRes.modifiedCount || 0,
      deleted: staleRelIds.length,
      unchanged: (relRes.matchedCount || 0) - (relRes.modifiedCount || 0),
    },
    careerSkills: {
      created: csRes.upsertedCount || 0,
      updated: csRes.modifiedCount || 0,
      deleted: staleCsIds.length,
      unchanged: (csRes.matchedCount || 0) - (csRes.modifiedCount || 0),
    },
    admin: adminStatus,
    warnings: [...(warnings || []), ...extraWarnings],
  };
}

/**
 * CLI runner for seeding the database.
 */
export async function runCli() {
  const args = process.argv.slice(2);
  const isReset = args.includes('--reset');
  const isForce = args.includes('--force');

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
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    const data = loadSeedFiles();
    // eslint-disable-next-line no-console
    console.log(
      `Loaded seed files: ${data.skills.length} skills, ${data.relationships.length} relationships, ${data.careers.length} careers, ${data.careerSkills.length} career-skills`,
    );

    if (isReset) {
      // eslint-disable-next-line no-console
      console.log(`Running seed with --reset${isForce ? ' (--force)' : ''}...`);
    }

    const summary = await seedKnowledgeBase({
      models,
      data,
      options: { reset: isReset, force: isForce },
    });

    // eslint-disable-next-line no-console
    console.log('\n--- Knowledge Base Seeding Summary ---');
    // eslint-disable-next-line no-console
    console.table({
      skills: summary.skills,
      careers: summary.careers,
      skillRelationships: summary.relationships,
      careerSkills: summary.careerSkills,
    });

    // eslint-disable-next-line no-console
    console.log(`Admin account: ${summary.admin} (${process.env.ADMIN_EMAIL || 'no ADMIN_EMAIL set'})`);

    if (summary.warnings && summary.warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`\nWarnings (${summary.warnings.length}):`);
      for (const w of summary.warnings) {
        // eslint-disable-next-line no-console
        console.warn(`  [WARN] ${w}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log('\nSeeding completed successfully.\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('\nSeeding failed:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Execute CLI wrapper if file is run directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runCli();
}
