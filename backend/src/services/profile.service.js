import { UserSkill } from '../models/userSkill.model.js';
import { BoundedCache } from '../utils/cache.js';

// In-memory bounded cache for student profile maps (30s TTL, max 1000 entries, LRU eviction)
const TTL_MS = 30 * 1000;
const profileCache = new BoundedCache({
  maxSize: 1000,
  ttlMs: TTL_MS,
  name: 'profileCache',
});

/**
 * Retrieve a student's skill profile as a plain object mapping skillSlug -> level.
 * Level 0 = absent (meaning skill is not yet acquired or proficiency is 0).
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Object} [options={}]
 * @param {import('mongoose').ClientSession} [options.session]
 * @param {boolean} [options.useCache]
 * @returns {Promise<Record<string, number>>} Plain object { skillSlug: proficiency }
 */
export async function getProfileMap(userId, options = {}) {
  if (!userId) {
    return {};
  }

  const key = userId.toString();
  const isCacheEnabled =
    options.useCache ??
    (process.env.NODE_ENV !== 'test' || process.env.ENABLE_PROFILE_CACHE === 'true');

  // Do not read from cache when executing inside a database session
  if (isCacheEnabled && !options.session) {
    const cached = profileCache.get(key);
    if (cached) {
      return { ...cached };
    }
  }

  const query = UserSkill.find({ userId });
  if (options.session) {
    query.session(options.session);
  }
  const userSkills = await query.populate('skillId', 'slug').lean();
  const profile = {};

  for (const us of userSkills) {
    const slug = us.skillId?.slug;
    const level = us.proficiency;
    if (slug && typeof level === 'number' && level > 0) {
      profile[slug] = level;
    }
  }

  if (isCacheEnabled && !options.session) {
    profileCache.set(key, profile);
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

/**
 * Check whether a user's profile is currently cached in memory.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {boolean}
 */
export function isProfileCached(userId) {
  if (!userId) return false;
  return profileCache.has(userId.toString());
}

/**
 * Diagnostic access to profile cache instance (for testing bounded capacity and eviction).
 */
export function getProfileCache() {
  return profileCache;
}

export default {
  getProfileMap,
  invalidateProfile,
  isProfileCached,
  getProfileCache,
};

