import { Career } from '../models/career.model.js';
import { CareerSkill } from '../models/careerSkill.model.js';
import { SkillRelationship } from '../models/skillRelationship.model.js';
import { buildCareerModel } from './engine/graph.js';
import { ApiError } from '../utils/ApiError.js';

// In-memory cache for career models with 5-minute TTL
const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

/**
 * Fetch and construct the career engine model for a given career slug.
 * Caches the result in memory for 5 minutes.
 *
 * @param {string} slug - Career slug (e.g. 'machine-learning-engineer')
 * @returns {Promise<{ career: Object, model: Object }>}
 */
export async function getCareerModel(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Career slug is required');
  }

  const now = Date.now();
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const career = await Career.findOne({ slug }).lean();
  if (!career) {
    throw new ApiError(404, 'NOT_FOUND', `Career '${slug}' not found`);
  }

  // Load career skills with populated skill data
  const csDocs = await CareerSkill.find({ careerId: career._id }).populate('skillId').lean();

  const skills = [];
  const careerSkills = [];
  const skillIdToSlug = new Map();
  const skillIds = [];

  for (const cs of csDocs) {
    const s = cs.skillId;
    if (!s || !s.slug) continue;

    const skillIdStr = s._id.toString();
    skillIdToSlug.set(skillIdStr, s.slug);
    skillIds.push(s._id);

    skills.push({
      slug: s.slug,
      name: s.name,
      category: s.category,
      difficulty: s.difficulty,
    });

    careerSkills.push({
      skillSlug: s.slug,
      importance: cs.importance,
      requiredLevel: cs.requiredLevel,
    });
  }

  // Load prerequisite and related relationships between skills in this career
  const relDocs = await SkillRelationship.find({
    sourceSkillId: { $in: skillIds },
    targetSkillId: { $in: skillIds },
  }).lean();

  const edges = [];
  for (const rel of relDocs) {
    const source = skillIdToSlug.get(rel.sourceSkillId.toString());
    const target = skillIdToSlug.get(rel.targetSkillId.toString());
    if (source && target) {
      edges.push({
        source,
        target,
        type: rel.relationshipType,
        strength: rel.strength,
      });
    }
  }

  const model = buildCareerModel({
    careerSlug: career.slug,
    skills,
    edges,
    careerSkills,
  });

  const data = {
    career,
    model,
  };

  cache.set(slug, {
    data,
    expiresAt: now + TTL_MS,
  });

  return data;
}

/**
 * Invalidate career model cache.
 * If slug is provided, removes only that career; otherwise clears all cached models.
 *
 * @param {string} [slug]
 */
export function invalidateCareerModels(slug) {
  if (slug) {
    cache.delete(slug);
  } else {
    cache.clear();
  }
}

/**
 * Pre-warm active career models in memory.
 */
export async function warmCareerModels() {
  try {
    const activeCareers = await Career.find({ isActive: true }).select('slug').lean();
    await Promise.all(activeCareers.map((c) => getCareerModel(c.slug).catch(() => null)));
  } catch {
    // Non-fatal if warming fails
  }
}

export default {
  getCareerModel,
  invalidateCareerModels,
  warmCareerModels,
};
