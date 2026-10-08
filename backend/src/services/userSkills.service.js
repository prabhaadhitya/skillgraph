import { User } from '../models/user.model.js';
import { Skill } from '../models/skill.model.js';
import { UserSkill } from '../models/userSkill.model.js';
import { UserProgress } from '../models/userProgress.model.js';
import { AlignmentSnapshot } from '../models/alignmentSnapshot.model.js';
import { LEVELS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
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
 * @returns {Promise<{ items: Array<Object>, fit: { score: number, previousScore: number|null, band: string } }>}
 */
export const putSkills = async (userId, skillsArray) => {
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
  const updatePromises = [];

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
        updatePromises.push(
          UserSkill.updateOne(
            { userId, skillId: skillDoc._id },
            { $set: { proficiency: current } },
          ),
        );
      }
    }
  }

  if (deleteIds.length > 0) {
    await UserSkill.deleteMany({ userId, skillId: { $in: deleteIds } });
  }
  if (createRows.length > 0) {
    await UserSkill.insertMany(createRows);
  }
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }
  if (progressRowsToInsert.length > 0) {
    await UserProgress.insertMany(progressRowsToInsert);
  }

  // Recalculate alignment snapshot
  const hasSnapshot = await AlignmentSnapshot.exists({ userId });
  const trigger = hasSnapshot ? 'skills_update' : 'onboarding';
  const fit = await alignmentService.recordSnapshot(userId, trigger);

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
 * @returns {Promise<{ skill: Object, previousLevel: number, proficiency: number, fit: Object }>}
 */
export const patchSkill = async (userId, skillSlug, proficiency) => {
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

  if (previousLevel !== currentLevel) {
    if (currentLevel === 0) {
      await UserSkill.deleteOne({ userId, skillId: skill._id });
    } else if (existing) {
      existing.proficiency = currentLevel;
      await existing.save();
    } else {
      await UserSkill.create({
        userId,
        skillId: skill._id,
        proficiency: currentLevel,
        source: 'self',
      });
    }

    await UserProgress.create({
      userId,
      skillId: skill._id,
      previousLevel,
      currentLevel,
    });
  }

  const hasSnapshot = await AlignmentSnapshot.exists({ userId });
  const trigger = hasSnapshot ? 'skills_update' : 'onboarding';
  const fit = await alignmentService.recordSnapshot(userId, trigger);

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
  setAlignmentService,
  getAlignmentService,
  getSkills,
  putSkills,
  patchSkill,
  getProgress,
};
