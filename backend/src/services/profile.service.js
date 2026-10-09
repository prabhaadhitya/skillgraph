import { UserSkill } from '../models/userSkill.model.js';

// In-memory cache for student profile maps (30s TTL, invalidated on skill mutations)
const profileCache = new Map();
const TTL_MS = 30 * 1000;

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

  const key = userId.toString();
  const now = Date.now();
  if (process.env.NODE_ENV !== 'test') {
    const cached = profileCache.get(key);
    if (cached && cached.expiresAt > now) {
      return { ...cached.profile };
    }
  }

  const userSkills = await UserSkill.find({ userId }).populate('skillId', 'slug').lean();
  const profile = {};

  for (const us of userSkills) {
    const slug = us.skillId?.slug;
    const level = us.proficiency;
    if (slug && typeof level === 'number' && level > 0) {
      profile[slug] = level;
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    profileCache.set(key, { profile, expiresAt: now + TTL_MS });
  }

  return profile;
}

/**
 * Invalidate cached profile for a user, or all users if no userId given.
 *
 * @param {string|import('mongoose').Types.ObjectId} [userId]
 */
export function invalidateProfile(userId) {
  if (userId) {
    profileCache.delete(userId.toString());
  } else {
    profileCache.clear();
  }
}

export default {
  getProfileMap,
  invalidateProfile,
};

