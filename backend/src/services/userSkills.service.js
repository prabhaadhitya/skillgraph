import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Skill } from '../models/skill.model.js';
import { UserSkill } from '../models/userSkill.model.js';
import { UserProgress } from '../models/userProgress.model.js';
import { AlignmentSnapshot } from '../models/alignmentSnapshot.model.js';
import { LEVELS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { invalidateProfile } from './profile.service.js';
import * as defaultAlignmentService from './alignment.service.js';

let alignmentService = defaultAlignmentService;

/**
 * Injects a mock or custom alignmentService instance (for testing).
 * @param {Object} service
 */
export const setAlignmentService = (service) => {
  alignmentService = service;
};

/**
 * Returns currently active alignmentService instance.
 * @returns {Object}
 */
export const getAlignmentService = () => alignmentService;

/**
 * Cached topology transaction support flag.
 * @type {boolean|null}
 */
let cachedTransactionSupport = null;

/**
 * Reset transaction support cache (for testing different topologies).
 */
export const resetTransactionSupportCache = () => {
  cachedTransactionSupport = null;
};

/**
 * Invalidate both profile and alignment caches for a user.
 * @param {string|import('mongoose').Types.ObjectId} userId
 */
const invalidateCaches = (userId) => {
  invalidateProfile(userId);
  if (typeof alignmentService?.invalidateAlignmentCache === 'function') {
    alignmentService.invalidateAlignmentCache(userId);
  }
};

/**
 * Detect whether the active MongoDB deployment topology supports multi-document transactions.
 * Returns true for replica sets, sharded clusters, or when overridden via FORCE_TRANSACTIONS=true.
 * Returns false for standalone instances or when FORCE_TRANSACTIONS=false.
 *
 * @returns {Promise<boolean>}
 */
export const supportsTransactions = async () => {
  if (process.env.FORCE_TRANSACTIONS === 'true') return true;
  if (process.env.FORCE_TRANSACTIONS === 'false') return false;
  if (cachedTransactionSupport !== null) return cachedTransactionSupport;

  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return false;
    }
    const topology = mongoose.connection.client?.topology;
    const topologyType = topology?.description?.type;
    if (topologyType === 'Single') {
      cachedTransactionSupport = false;
      return false;
    }
    if (
      topologyType &&
      (topologyType.includes('ReplicaSet') ||
        topologyType === 'Sharded' ||
        topologyType === 'LoadBalanced')
    ) {
      cachedTransactionSupport = true;
      return true;
    }

    // Attempt a lightweight probe if topology is ambiguous
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await session.abortTransaction();
      cachedTransactionSupport = true;
      return true;
    } catch {
      cachedTransactionSupport = false;
      return false;
    } finally {
      await session.endSession();
    }
  } catch {
    cachedTransactionSupport = false;
    return false;
  }
};

/**
 * Safely roll back mutations across UserSkill, UserProgress, and AlignmentSnapshot
 * when running without multi-document transactions.
 *
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.userId
 * @param {string|import('mongoose').Types.ObjectId} params.targetCareerId
 * @param {Array<Object>} params.priorUserSkills - Snapshot of user's skills before mutation
 * @param {Object|null} params.priorLatestSnapshot - Snapshot of user's latest alignment snapshot before mutation
 * @param {Array<import('mongoose').Types.ObjectId>} [params.insertedProgressIds] - IDs of progress rows created during mutation
 */
export const executeCompensatingRollback = async ({
  userId,
  targetCareerId,
  priorUserSkills = [],
  priorLatestSnapshot = null,
  insertedProgressIds = [],
}) => {
  // 1. Revert UserProgress
  if (insertedProgressIds.length > 0) {
    await UserProgress.deleteMany({ _id: { $in: insertedProgressIds } });
  }

  // 2. Revert UserSkill
  await UserSkill.deleteMany({ userId });
  if (priorUserSkills.length > 0) {
    await UserSkill.insertMany(
      priorUserSkills.map((s) => ({
        _id: s._id,
        userId: s.userId,
        skillId: s.skillId,
        proficiency: s.proficiency,
        source: s.source || 'self',
      })),
    );
  }

  // 3. Revert AlignmentSnapshot
  if (priorLatestSnapshot) {
    // Delete any snapshots created during this failed run
    await AlignmentSnapshot.deleteMany({
      userId,
      careerId: targetCareerId,
      _id: { $ne: priorLatestSnapshot._id },
      createdAt: { $gte: priorLatestSnapshot.createdAt },
    });
    // Revert latest snapshot fields if it was updated in-place
    await AlignmentSnapshot.updateOne(
      { _id: priorLatestSnapshot._id },
      {
        $set: {
          fitScore: priorLatestSnapshot.fitScore,
          coverage: priorLatestSnapshot.coverage,
          readiness: priorLatestSnapshot.readiness,
          trigger: priorLatestSnapshot.trigger,
        },
      },
    );
  } else {
    // No snapshot existed prior to this run: delete any created during this run
    await AlignmentSnapshot.deleteMany({
      userId,
      careerId: targetCareerId,
    });
  }

  // 4. Invalidate in-memory caches
  invalidateCaches(userId);
};

/**
 * Format skill document to SkillRef.
 * @param {Object} skillDoc
 * @returns {{ id: string, slug: string, name: string, category: string }}
 */
const formatSkillRef = (skillDoc) => ({
  id: skillDoc._id ? skillDoc._id.toString() : skillDoc.id,
  slug: skillDoc.slug,
  name: skillDoc.name,
  category: skillDoc.category,
});

/**
 * Map proficiency number to human readable label.
 * @param {number} proficiency
 * @returns {string}
 */
const getLevelLabel = (proficiency) => {
  const match = LEVELS.find((l) => l.value === proficiency);
  return match ? match.label : `Level ${proficiency}`;
};

/**
 * Get current student skills.
 * GET /api/users/me/skills
 *
 * @param {string} userId
 * @returns {Promise<{ items: Array<Object> }>}
 */
export const getSkills = async (userId) => {
  const userSkills = await UserSkill.find({ userId })
    .populate('skillId')
    .sort({ 'skillId.name': 1 });

  const items = userSkills
    .filter((us) => us.skillId)
    .map((us) => ({
      skill: formatSkillRef(us.skillId),
      proficiency: us.proficiency,
      levelLabel: getLevelLabel(us.proficiency),
      source: us.source || 'self',
    }));

  return { items };
};

/**
 * Replace student skill proficiencies.
 * PUT /api/users/me/skills
 *
 * Replaces the entire profile. Proficiency 0 deletes the skill row.
 * Writes a userProgress row for each skill whose level actually changed.
 * Unchanged skills write nothing.
 *
 * @param {string} userId
 * @param {Array<{ skillSlug: string, proficiency: number }>} skillsArray
 * @param {Object} [options={}]
 * @param {string} [options.failAt] - 'after_skills' | 'after_progress' | 'in_snapshot'
 * @param {boolean} [options.forceTransactionMode] - Force transaction vs compensating mode
 * @param {Date|number} [options.now] - Optional timestamp provider
 * @returns {Promise<{ items: Array<Object>, fit: { score: number, previousScore: number|null, band: string } }>}
 */
export const putSkills = async (userId, skillsArray, options = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  if (!user.targetCareerId) {
    throw new ApiError(422, 'RULE_VIOLATION', 'Choose a target career first');
  }

  // Verify all incoming skills exist in catalog
  const incomingSlugs = [...new Set(skillsArray.map((s) => s.skillSlug))];
  const catalogSkills = await Skill.find({ slug: { $in: incomingSlugs } });
  const catalogBySlug = new Map(catalogSkills.map((s) => [s.slug, s]));

  for (const item of skillsArray) {
    if (!catalogBySlug.has(item.skillSlug)) {
      throw new ApiError(404, 'NOT_FOUND', `Skill '${item.skillSlug}' not found`);
    }
  }

  // Desired state from input
  const desiredMap = new Map();
  for (const item of skillsArray) {
    const skillDoc = catalogBySlug.get(item.skillSlug);
    desiredMap.set(skillDoc._id.toString(), {
      proficiency: item.proficiency,
      skillDoc,
    });
  }

  // Existing user skills
  const existingUserSkills = await UserSkill.find({ userId }).populate('skillId');
  const existingMap = new Map();
  for (const us of existingUserSkills) {
    if (us.skillId) {
      existingMap.set(us.skillId._id.toString(), {
        proficiency: us.proficiency,
        skillDoc: us.skillId,
      });
    }
  }

  // Compute diffs
  const allSkillIds = new Set([...existingMap.keys(), ...desiredMap.keys()]);
  const progressRowsToInsert = [];
  const deleteIds = [];
  const createRows = [];
  const updateOps = [];

  for (const skillIdStr of allSkillIds) {
    const previous = existingMap.get(skillIdStr)?.proficiency || 0;
    const current = desiredMap.get(skillIdStr)?.proficiency || 0;
    const skillDoc = desiredMap.get(skillIdStr)?.skillDoc || existingMap.get(skillIdStr)?.skillDoc;

    if (previous !== current) {
      progressRowsToInsert.push({
        userId,
        skillId: skillDoc._id,
        previousLevel: previous,
        currentLevel: current,
      });

      if (current === 0) {
        deleteIds.push(skillDoc._id);
      } else if (previous === 0) {
        createRows.push({
          userId,
          skillId: skillDoc._id,
          proficiency: current,
          source: 'self',
        });
      } else {
        updateOps.push({
          filter: { userId, skillId: skillDoc._id },
          update: { $set: { proficiency: current } },
        });
      }
    }
  }

  const useTransactions =
    options.forceTransactionMode !== undefined
      ? Boolean(options.forceTransactionMode)
      : await supportsTransactions();

  let fit;

  if (useTransactions) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (deleteIds.length > 0) {
          await UserSkill.deleteMany({ userId, skillId: { $in: deleteIds } }).session(session);
        }
        if (createRows.length > 0) {
          await UserSkill.insertMany(createRows, { session });
        }
        if (updateOps.length > 0) {
          await Promise.all(
            updateOps.map((op) => UserSkill.updateOne(op.filter, op.update).session(session)),
          );
        }

        if (options.failAt === 'after_skills') {
          throw new Error('Injected failure: after_skills');
        }

        if (progressRowsToInsert.length > 0) {
          await UserProgress.insertMany(progressRowsToInsert, { session });
        }

        if (options.failAt === 'after_progress') {
          throw new Error('Injected failure: after_progress');
        }

        const hasSnapshot = await AlignmentSnapshot.exists({ userId }).session(session);
        const trigger = hasSnapshot ? 'skills_update' : 'onboarding';
        fit = await alignmentService.recordSnapshot(userId, trigger, {
          session,
          now: options.now,
          failAt: options.failAt,
        });
      });
    } catch (err) {
      invalidateCaches(userId);
      throw err;
    } finally {
      await session.endSession();
    }
  } else {
    // Non-transactional topology: Compensating Recovery Strategy
    const priorUserSkills = await UserSkill.find({ userId }).lean();
    const priorLatestSnapshot = await AlignmentSnapshot.findOne({
      userId,
      careerId: user.targetCareerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    let insertedProgressIds = [];

    try {
      if (deleteIds.length > 0) {
        await UserSkill.deleteMany({ userId, skillId: { $in: deleteIds } });
      }
      if (createRows.length > 0) {
        await UserSkill.insertMany(createRows);
      }
      if (updateOps.length > 0) {
        await Promise.all(
          updateOps.map((op) => UserSkill.updateOne(op.filter, op.update)),
        );
      }

      if (options.failAt === 'after_skills') {
        throw new Error('Injected failure: after_skills');
      }

      if (progressRowsToInsert.length > 0) {
        const inserted = await UserProgress.insertMany(progressRowsToInsert);
        insertedProgressIds = inserted.map((p) => p._id);
      }

      if (options.failAt === 'after_progress') {
        throw new Error('Injected failure: after_progress');
      }

      const hasSnapshot = await AlignmentSnapshot.exists({ userId });
      const trigger = hasSnapshot ? 'skills_update' : 'onboarding';
      fit = await alignmentService.recordSnapshot(userId, trigger, {
        now: options.now,
        failAt: options.failAt,
      });
    } catch (err) {
      await executeCompensatingRollback({
        userId,
        targetCareerId: user.targetCareerId,
        priorUserSkills,
        priorLatestSnapshot,
        insertedProgressIds,
      });
      throw err;
    }
  }

  invalidateCaches(userId);

  // Return updated items
  const updatedUserSkills = await UserSkill.find({ userId })
    .populate('skillId')
    .sort({ 'skillId.name': 1 });

  const items = updatedUserSkills
    .filter((us) => us.skillId)
    .map((us) => ({
      skill: formatSkillRef(us.skillId),
      proficiency: us.proficiency,
      levelLabel: getLevelLabel(us.proficiency),
      source: us.source || 'self',
    }));

  return { items, fit };
};

/**
 * Update a single skill proficiency.
 * PATCH /api/users/me/skills/:skillSlug
 *
 * @param {string} userId
 * @param {string} skillSlug
 * @param {number} proficiency
 * @param {Object} [options={}]
 * @param {string} [options.failAt] - 'after_skills' | 'after_progress' | 'in_snapshot'
 * @param {boolean} [options.forceTransactionMode] - Force transaction vs compensating mode
 * @param {Date|number} [options.now] - Optional timestamp provider
 * @returns {Promise<{ skill: Object, previousLevel: number, proficiency: number, fit: Object }>}
 */
export const patchSkill = async (userId, skillSlug, proficiency, options = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  if (!user.targetCareerId) {
    throw new ApiError(422, 'RULE_VIOLATION', 'Choose a target career first');
  }

  const skill = await Skill.findOne({ slug: skillSlug });
  if (!skill) {
    throw new ApiError(404, 'NOT_FOUND', `Skill '${skillSlug}' not found`);
  }

  const existing = await UserSkill.findOne({ userId, skillId: skill._id });
  const previousLevel = existing ? existing.proficiency : 0;
  const currentLevel = proficiency;

  const useTransactions =
    options.forceTransactionMode !== undefined
      ? Boolean(options.forceTransactionMode)
      : await supportsTransactions();

  let fit;

  if (useTransactions) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (previousLevel !== currentLevel) {
          if (currentLevel === 0) {
            await UserSkill.deleteOne({ userId, skillId: skill._id }).session(session);
          } else if (existing) {
            await UserSkill.updateOne(
              { userId, skillId: skill._id },
              { $set: { proficiency: currentLevel } },
            ).session(session);
          } else {
            await UserSkill.create(
              [
                {
                  userId,
                  skillId: skill._id,
                  proficiency: currentLevel,
                  source: 'self',
                },
              ],
              { session },
            );
          }

          if (options.failAt === 'after_skills') {
            throw new Error('Injected failure: after_skills');
          }

          await UserProgress.create(
            [
              {
                userId,
                skillId: skill._id,
                previousLevel,
                currentLevel,
              },
            ],
            { session },
          );

          if (options.failAt === 'after_progress') {
            throw new Error('Injected failure: after_progress');
          }
        }

        const hasSnapshot = await AlignmentSnapshot.exists({ userId }).session(session);
        const trigger = hasSnapshot ? 'skills_update' : 'onboarding';
        fit = await alignmentService.recordSnapshot(userId, trigger, {
          session,
          now: options.now,
          failAt: options.failAt,
        });
      });
    } catch (err) {
      invalidateCaches(userId);
      throw err;
    } finally {
      await session.endSession();
    }
  } else {
    // Non-transactional topology: Compensating Recovery Strategy
    const priorUserSkill = existing
      ? {
          _id: existing._id,
          proficiency: existing.proficiency,
          source: existing.source || 'self',
        }
      : null;
    const priorLatestSnapshot = await AlignmentSnapshot.findOne({
      userId,
      careerId: user.targetCareerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    let createdProgressDoc = null;

    try {
      if (previousLevel !== currentLevel) {
        if (currentLevel === 0) {
          await UserSkill.deleteOne({ userId, skillId: skill._id });
        } else if (existing) {
          await UserSkill.updateOne(
            { userId, skillId: skill._id },
            { $set: { proficiency: currentLevel } },
          );
        } else {
          await UserSkill.create({
            userId,
            skillId: skill._id,
            proficiency: currentLevel,
            source: 'self',
          });
        }

        if (options.failAt === 'after_skills') {
          throw new Error('Injected failure: after_skills');
        }

        createdProgressDoc = await UserProgress.create({
          userId,
          skillId: skill._id,
          previousLevel,
          currentLevel,
        });

        if (options.failAt === 'after_progress') {
          throw new Error('Injected failure: after_progress');
        }
      }

      const hasSnapshot = await AlignmentSnapshot.exists({ userId });
      const trigger = hasSnapshot ? 'skills_update' : 'onboarding';
      fit = await alignmentService.recordSnapshot(userId, trigger, {
        now: options.now,
        failAt: options.failAt,
      });
    } catch (err) {
      // Compensating recovery on failure:
      if (createdProgressDoc) {
        await UserProgress.deleteOne({ _id: createdProgressDoc._id });
      }

      if (previousLevel !== currentLevel) {
        if (priorUserSkill === null) {
          await UserSkill.deleteOne({ userId, skillId: skill._id });
        } else {
          await UserSkill.updateOne(
            { userId, skillId: skill._id },
            {
              $set: {
                proficiency: priorUserSkill.proficiency,
                source: priorUserSkill.source,
              },
            },
            { upsert: true },
          );
        }
      }

      if (priorLatestSnapshot) {
        await AlignmentSnapshot.deleteMany({
          userId,
          careerId: user.targetCareerId,
          _id: { $ne: priorLatestSnapshot._id },
          createdAt: { $gte: priorLatestSnapshot.createdAt },
        });
        await AlignmentSnapshot.updateOne(
          { _id: priorLatestSnapshot._id },
          {
            $set: {
              fitScore: priorLatestSnapshot.fitScore,
              coverage: priorLatestSnapshot.coverage,
              readiness: priorLatestSnapshot.readiness,
              trigger: priorLatestSnapshot.trigger,
            },
          },
        );
      } else {
        await AlignmentSnapshot.deleteMany({
          userId,
          careerId: user.targetCareerId,
        });
      }

      invalidateCaches(userId);
      throw err;
    }
  }

  invalidateCaches(userId);

  return {
    skill: formatSkillRef(skill),
    previousLevel,
    proficiency: currentLevel,
    fit,
  };
};

/**
 * Get student progress and alignment history.
 * GET /api/users/me/progress
 *
 * @param {string} userId
 * @returns {Promise<{ history: Array<Object>, alignment: Array<Object> }>}
 */
export const getProgress = async (userId) => {
  const historyDocs = await UserProgress.find({ userId })
    .sort({ createdAt: -1 })
    .populate('skillId');

  const history = historyDocs
    .filter((hp) => hp.skillId)
    .map((hp) => ({
      skill: formatSkillRef(hp.skillId),
      previousLevel: hp.previousLevel,
      currentLevel: hp.currentLevel,
      at: hp.createdAt.toISOString(),
    }));

  const snapshotDocs = await AlignmentSnapshot.find({ userId })
    .sort({ createdAt: -1 })
    .populate('careerId');

  const alignment = snapshotDocs
    .filter((s) => s.careerId)
    .map((s) => ({
      at: s.createdAt.toISOString(),
      fitScore: s.fitScore,
      careerSlug: s.careerId.slug,
    }));

  return { history, alignment };
};

export default {
  supportsTransactions,
  resetTransactionSupportCache,
  executeCompensatingRollback,
  setAlignmentService,
  getAlignmentService,
  getSkills,
  putSkills,
  patchSkill,
  getProgress,
};
