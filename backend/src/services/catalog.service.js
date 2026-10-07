import { Skill } from '../models/skill.model.js';
import { Career } from '../models/career.model.js';
import { CareerSkill } from '../models/careerSkill.model.js';
import { SkillRelationship } from '../models/skillRelationship.model.js';
import { UserSkill } from '../models/userSkill.model.js';
import { LEVELS, getImportanceLabel } from '../config/constants.js';
import { getGapStatus } from '../utils/gapStatus.js';
import { ApiError } from '../utils/ApiError.js';

export const escapeRegex = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * List skills with filtering and pagination.
 *
 * @param {Object} queryParams
 * @param {string} [queryParams.category]
 * @param {string} [queryParams.q]
 * @param {number} [queryParams.page=1]
 * @param {number} [queryParams.limit=20]
 * @returns {Promise<{ skills: Array<Object>, meta: Object }>}
 */
export const listSkills = async ({ category, q, page = 1, limit = 20 }) => {
  const filter = {};
  if (category) {
    filter.category = category;
  }
  if (q) {
    filter.name = { $regex: escapeRegex(q), $options: 'i' };
  }

  const total = await Skill.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;

  const rawSkills = await Skill.find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const skills = rawSkills.map((s) => ({
    id: s._id.toString(),
    slug: s.slug,
    name: s.name,
    description: s.description,
    category: s.category,
    difficulty: s.difficulty,
  }));

  return {
    skills,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  };
};

/**
 * Get skill detail with relationships and user proficiency context.
 * Matches docs/API.md §5 GET /skills/:slug.
 *
 * @param {string} slug
 * @param {Object} user - Authenticated user context from req.user
 * @returns {Promise<Object>}
 */
export const getSkillDetail = async (slug, user) => {
  const skillDoc = await Skill.findOne({ slug });
  if (!skillDoc) {
    throw new ApiError(404, 'NOT_FOUND', `Skill '${slug}' not found`);
  }

  const skillId = skillDoc._id;

  // Fetch relationships touching this skill
  const [prereqEdges, unlockEdges, relatedEdges, careerSkillDocs, userSkillDoc] =
    await Promise.all([
      SkillRelationship.find({
        targetSkillId: skillId,
        relationshipType: 'PREREQUISITE',
      })
        .populate('sourceSkillId', 'slug name category')
        .lean(),
      SkillRelationship.find({
        sourceSkillId: skillId,
        relationshipType: 'PREREQUISITE',
      })
        .populate('targetSkillId', 'slug name category')
        .lean(),
      SkillRelationship.find({
        $or: [{ sourceSkillId: skillId }, { targetSkillId: skillId }],
        relationshipType: 'RELATED_TO',
      })
        .populate('sourceSkillId targetSkillId', 'slug name category')
        .lean(),
      CareerSkill.find({ skillId })
        .populate('careerId', 'slug name isActive')
        .lean(),
      user ? UserSkill.findOne({ userId: user.id, skillId }).lean() : null,
    ]);

  const prerequisites = prereqEdges
    .filter((e) => e.sourceSkillId)
    .map((e) => ({
      slug: e.sourceSkillId.slug,
      name: e.sourceSkillId.name,
      category: e.sourceSkillId.category,
    }));

  const unlocks = unlockEdges
    .filter((e) => e.targetSkillId)
    .map((e) => ({
      slug: e.targetSkillId.slug,
      name: e.targetSkillId.name,
      category: e.targetSkillId.category,
    }));

  const relatedMap = new Map();
  for (const e of relatedEdges) {
    const isSource = e.sourceSkillId?._id?.toString() === skillId.toString();
    const other = isSource ? e.targetSkillId : e.sourceSkillId;
    if (other && !relatedMap.has(other.slug)) {
      relatedMap.set(other.slug, {
        slug: other.slug,
        name: other.name,
        category: other.category,
      });
    }
  }
  const related = Array.from(relatedMap.values());

  const requiredFor = careerSkillDocs
    .filter((cs) => cs.careerId && cs.careerId.isActive)
    .map((cs) => ({
      career: {
        slug: cs.careerId.slug,
        name: cs.careerId.name,
      },
      importance: cs.importance,
      importanceLabel: getImportanceLabel(cs.importance),
      requiredLevel: cs.requiredLevel,
    }));

  // Build "you" block
  const proficiency = userSkillDoc ? userSkillDoc.proficiency : 0;
  const levelMatch = LEVELS.find((l) => l.value === proficiency);
  const levelLabel = levelMatch ? levelMatch.label : 'Not Started';

  let status = null;
  let targetRequiredLevel = null;

  if (user && user.targetCareerId) {
    const targetCareerIdStr = (
      user.targetCareerId._id || user.targetCareerId
    ).toString();

    const targetCareerSkill = careerSkillDocs.find(
      (cs) => cs.careerId && cs.careerId._id?.toString() === targetCareerIdStr,
    );

    if (targetCareerSkill) {
      targetRequiredLevel = targetCareerSkill.requiredLevel;
      status = getGapStatus(targetRequiredLevel - proficiency);
    }
  }

  return {
    skill: {
      id: skillDoc._id.toString(),
      slug: skillDoc.slug,
      name: skillDoc.name,
      description: skillDoc.description,
      category: skillDoc.category,
      difficulty: skillDoc.difficulty,
    },
    prerequisites,
    unlocks,
    related,
    requiredFor,
    you: {
      proficiency,
      levelLabel,
      status,
      targetRequiredLevel,
    },
  };
};

/**
 * List active careers with skill counts.
 * Matches docs/API.md §5 GET /careers.
 *
 * @returns {Promise<Array<Object>>}
 */
export const listCareers = async () => {
  const careers = await Career.find({ isActive: true }).sort({ name: 1 }).lean();

  const skillCounts = await CareerSkill.aggregate([
    { $group: { _id: '$careerId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map();
  for (const item of skillCounts) {
    countMap.set(item._id.toString(), item.count);
  }

  return careers.map((c) => ({
    id: c._id.toString(),
    slug: c.slug,
    name: c.name,
    description: c.description,
    category: c.category,
    icon: c.icon,
    skillCount: countMap.get(c._id.toString()) || 0,
  }));
};

/**
 * Get career detail with required skills.
 * Matches docs/API.md §5 GET /careers/:slug.
 *
 * @param {string} slug
 * @returns {Promise<Object>}
 */
export const getCareerDetail = async (slug) => {
  const career = await Career.findOne({ slug, isActive: true }).lean();
  if (!career) {
    throw new ApiError(404, 'NOT_FOUND', `Career '${slug}' not found`);
  }

  const careerSkills = await CareerSkill.find({ careerId: career._id })
    .populate('skillId', 'slug name category difficulty')
    .lean();

  const skills = careerSkills
    .filter((cs) => cs.skillId)
    .map((cs) => ({
      skill: {
        slug: cs.skillId.slug,
        name: cs.skillId.name,
        category: cs.skillId.category,
        difficulty: cs.skillId.difficulty,
      },
      importance: cs.importance,
      importanceLabel: getImportanceLabel(cs.importance),
      requiredLevel: cs.requiredLevel,
    }));

  return {
    career: {
      id: career._id.toString(),
      slug: career.slug,
      name: career.name,
      description: career.description,
      category: career.category,
      icon: career.icon,
    },
    skills,
  };
};

export default {
  listSkills,
  getSkillDetail,
  listCareers,
  getCareerDetail,
};
