import { UserSkill } from '../models/userSkill.model.js';

/**
 * Retrieve a student's skill profile as a plain object mapping skillSlug -> level.
 * Level 0 = absent (meaning skill is not yet acquired or proficiency is 0).
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Record<string, number>>} Plain object { skillSlug: proficiency }
 */
export async function getProfileMap(userId) {
  if (!userId) {
    return {};
  }

  const userSkills = await UserSkill.find({ userId }).populate('skillId', 'slug');
  const profile = {};

  for (const us of userSkills) {
    const slug = us.skillId?.slug;
    const level = us.proficiency;
    if (slug && typeof level === 'number' && level > 0) {
      profile[slug] = level;
    }
  }

  return profile;
}

export default {
  getProfileMap,
};
