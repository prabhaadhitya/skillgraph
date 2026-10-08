import { LEVELS } from '../../../config/constants.js';

/**
 * Maps a numeric proficiency level to its human-readable label.
 *
 * @param {number} level
 * @returns {string}
 */
export function getLevelLabel(level) {
  const found = LEVELS.find((l) => l.value === level);
  return found ? found.label : (level ? `Level ${level}` : 'Not Started');
}

/**
 * Safely resolves user's target career slug from injected deps or direct models.
 *
 * @param {Object} deps - Injected dependencies
 * @param {string} userId - User identifier
 * @param {string} [requestedSlug] - Career slug optionally passed in params
 * @returns {Promise<string|null>}
 */
export async function resolveUserTargetCareerSlug(deps, userId, requestedSlug) {
  if (requestedSlug && typeof requestedSlug === 'string' && requestedSlug.trim()) {
    return requestedSlug.trim();
  }

  if (!userId) return null;

  try {
    // 1. Check profileService.getTargetCareer
    if (typeof deps.profileService?.getTargetCareer === 'function') {
      const slug = await deps.profileService.getTargetCareer(userId);
      if (slug) return slug;
    }

    // 2. Check userService.getProfile
    if (typeof deps.userService?.getProfile === 'function') {
      const p = await deps.userService.getProfile(userId);
      if (p?.targetCareer?.slug) return p.targetCareer.slug;
      if (p?.targetCareerSlug) return p.targetCareerSlug;
    }

    // 3. Check profileService.getProfile
    if (typeof deps.profileService?.getProfile === 'function') {
      const p = await deps.profileService.getProfile(userId);
      if (p?.targetCareer?.slug) return p.targetCareer.slug;
      if (p?.targetCareerSlug) return p.targetCareerSlug;
    }

    // 4. Fallback: User mongoose model if available
    const { User } = await import('../../../models/user.model.js');
    const user = await User.findById(userId).populate('targetCareerId');
    return user?.targetCareerId?.slug || null;
  } catch {
    return null;
  }
}

/**
 * Safely loads career and model from careerModelService without throwing.
 *
 * @param {Object} deps
 * @param {string} careerSlug
 * @returns {Promise<{ career: Object, model: Object }|null>}
 */
export async function getCareerModelSafe(deps, careerSlug) {
  if (!careerSlug || typeof careerSlug !== 'string') return null;

  try {
    if (typeof deps.careerModelService?.getCareerModel === 'function') {
      const result = await deps.careerModelService.getCareerModel(careerSlug);
      if (result && result.model) return result;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Validates whether a career slug is in the allowed list of active careers.
 *
 * @param {Object} deps
 * @param {string} careerSlug
 * @returns {Promise<boolean>}
 */
export async function isCareerSlugAllowed(deps, careerSlug) {
  if (!careerSlug || typeof careerSlug !== 'string') return false;

  // Explicit allow-list in deps
  if (deps.allowList?.careers) {
    const c = deps.allowList.careers;
    return typeof c.has === 'function' ? c.has(careerSlug) : Array.isArray(c) && c.includes(careerSlug);
  }

  // Check via careerModelService
  const loaded = await getCareerModelSafe(deps, careerSlug);
  return Boolean(loaded && loaded.model);
}

/**
 * Validates whether a skill slug is in the allowed list of real catalog skills.
 *
 * @param {Object} deps
 * @param {string} skillSlug
 * @param {Object} [careerModel]
 * @returns {Promise<boolean>|boolean}
 */
export async function isSkillSlugAllowed(deps, skillSlug, careerModel = null) {
  if (!skillSlug || typeof skillSlug !== 'string') return false;

  // 1. Explicit allow-list in deps
  if (deps.allowList?.skills) {
    const s = deps.allowList.skills;
    return typeof s.has === 'function' ? s.has(skillSlug) : Array.isArray(s) && s.includes(skillSlug);
  }

  // 2. Check within provided careerModel
  if (careerModel) {
    if (careerModel.skills instanceof Map && careerModel.skills.has(skillSlug)) {
      return true;
    }
    if (Array.isArray(careerModel.skills) && careerModel.skills.some((s) => s.slug === skillSlug)) {
      return true;
    }
    if (careerModel.careerSlugs instanceof Set && careerModel.careerSlugs.has(skillSlug)) {
      return true;
    }
    if (Array.isArray(careerModel.careerSkillsList) && careerModel.careerSkillsList.some((cs) => cs.skillSlug === skillSlug)) {
      return true;
    }
  }

  // 3. Check catalogService and database
  try {
    if (typeof deps.catalogService?.getSkill === 'function') {
      const skill = await deps.catalogService.getSkill(skillSlug);
      if (skill) return true;
    }
    if (typeof deps.catalogService?.getSkillDetail === 'function') {
      const skill = await deps.catalogService.getSkillDetail(skillSlug);
      if (skill) return true;
    }
    const { Skill } = await import('../../../models/skill.model.js');
    const skillDoc = await Skill.findOne({ slug: skillSlug }).lean();
    if (skillDoc) return true;
  } catch {
    // Ignore and fallback
  }

  return false;
}

/**
 * Extracts normalized skill metadata from a career model.
 *
 * @param {Object} model
 * @param {string} skillSlug
 * @returns {{ slug: string, name: string, category: string, difficulty: number }}
 */
export function getSkillData(model, skillSlug) {
  if (!model || !skillSlug) return { slug: skillSlug, name: skillSlug, category: 'general', difficulty: 1 };

  let skillObj = null;
  if (model.skills instanceof Map) {
    skillObj = model.skills.get(skillSlug);
  } else if (Array.isArray(model.skills)) {
    skillObj = model.skills.find((s) => s.slug === skillSlug);
  } else if (typeof model.skills === 'object' && model.skills !== null) {
    skillObj = model.skills[skillSlug];
  }

  if (skillObj) {
    return {
      slug: skillObj.slug || skillSlug,
      name: skillObj.name || skillSlug,
      category: skillObj.category || 'general',
      difficulty: skillObj.difficulty ?? 1,
    };
  }

  return { slug: skillSlug, name: skillSlug, category: 'general', difficulty: 1 };
}
