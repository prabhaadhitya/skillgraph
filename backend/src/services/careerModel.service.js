import { Career } from '../models/career.model.js';
import { CareerSkill } from '../models/careerSkill.model.js';
import { SkillRelationship } from '../models/skillRelationship.model.js';
import { buildCareerModel } from './engine/graph.js';
import { ApiError } from '../utils/ApiError.js';
import { BoundedCache } from '../utils/cache.js';

// In-memory bounded cache for career models with 5-minute TTL, max 100 entries, LRU eviction
const TTL_MS = 5 * 60 * 1000;
const careerModelCache = new BoundedCache({
  maxSize: 100,
  ttlMs: TTL_MS,
  name: 'careerModelCache',
});

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

  const cached = careerModelCache.get(slug);
  if (cached) {
    return cached;
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

  careerModelCache.set(slug, data);

  return data;
}

/**
 * Check whether a career model is currently cached in memory.
 *
 * @param {string} slug
 * @returns {boolean}
 */
export function isCareerModelCached(slug) {
  if (!slug) return false;
  return careerModelCache.has(slug);
}

/**
 * Invalidate career model cache.
 * If slug is provided, removes only that career; otherwise clears all cached models.
 *
 * @param {string} [slug]
 */
export function invalidateCareerModels(slug) {
  if (slug) {
    careerModelCache.delete(slug);
  } else {
    careerModelCache.clear();
  }
}

/**
 * Diagnostic access to career model cache instance.
 *
 * @returns {BoundedCache}
 */
export function getCareerModelCache() {
  return careerModelCache;
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
  isCareerModelCached,
  invalidateCareerModels,
  getCareerModelCache,
  warmCareerModels,
};
