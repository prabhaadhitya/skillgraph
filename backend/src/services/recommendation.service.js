import { mlClient as defaultMlClient } from './mlClient.js';
import * as careerModelService from './careerModel.service.js';
import * as profileService from './profile.service.js';
import engine, { isReady, getNextSkills as engineGetNextSkills } from './engine/index.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Resolves career slug from requested argument or student's target career.
 *
 * @param {string} userId
 * @param {string} [requestedCareerSlug]
 * @returns {Promise<string>}
 */
async function resolveCareer(userId, requestedCareerSlug) {
  if (requestedCareerSlug && typeof requestedCareerSlug === 'string' && requestedCareerSlug.trim()) {
    return requestedCareerSlug.trim();
  }

  const user = await User.findById(userId).populate('targetCareerId');
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.targetCareerId?.slug) {
    return user.targetCareerId.slug;
  }

  throw new ApiError(422, 'RULE_VIOLATION', 'User has no target career set and no career was specified');
}

/**
 * Get next skill recommendations for a student.
 * Supports strategies: "auto" | "rule" | "ml".
 *
 * Falls back safely to rule engine if ML service is unreachable.
 *
 * @param {string} userId - Student ID
 * @param {string} [careerSlug] - Career slug (optional; defaults to user target)
 * @param {Object} [options={}]
 * @param {number} [options.limit=3] - Maximum items to return
 * @param {'auto'|'rule'|'ml'} [options.strategy='auto'] - Recommender strategy
 * @param {Object} [options.deps] - Optional injected dependencies for testing
 * @returns {Promise<{
 *   strategy: 'rule'|'ml',
 *   modelVersion: string|null,
 *   fallbackReason: string|null,
 *   items: Array<{ skill: Object, score: number, isReadyNow: boolean, reasons: string[] }>
 * }>}
 */
export async function getNextSkills(
  userId,
  careerSlug,
  { limit = 3, strategy = 'auto', deps = {} } = {},
) {
  const cms = deps.careerModelService || careerModelService;
  const ps = deps.profileService || profileService;
  const eng = deps.engine || engine;
  const ml = deps.mlClient || defaultMlClient;

  const resolvedSlug = careerSlug && typeof careerSlug === 'string' && careerSlug.trim()
    ? careerSlug.trim()
    : await resolveCareer(userId, careerSlug);
  const model = deps.model || (await cms.getCareerModel(resolvedSlug)).model;
  const profile = deps.profile || (await ps.getProfileMap(userId)) || {};

  // If strategy is "ml" or "auto", attempt to query the ML service
  if (strategy === 'ml' || strategy === 'auto') {
    try {
      let userSemester = deps.user?.semester;
      if (userSemester === undefined) {
        try {
          const u = await User.findById(userId).lean();
          userSemester = u?.semester;
        } catch {
          // Ignore user lookup error
        }
      }

      const mlRes = await ml.recommend({
        careerSlug: resolvedSlug,
        proficiencies: profile,
        semester: userSemester,
        topK: 10,
      });

      if (mlRes && Array.isArray(mlRes.items) && mlRes.items.length > 0) {
        // Intersect with candidate skills that have gap > 0 and are ready per prerequisite graph
        const readyCandidateItems = [];

        for (const item of mlRes.items) {
          const sSlug = item.skillSlug || item.slug;
          if (!sSlug) continue;

          const cs = model.careerSkillMap instanceof Map
            ? model.careerSkillMap.get(sSlug)
            : (model.careerSkillsList || []).find((c) => c.skillSlug === sSlug);
          if (!cs) continue;

          const currentLevel = profile[sSlug] ?? 0;
          const reqLevel = cs.requiredLevel ?? 1;
          const gap = Math.max(0, reqLevel - currentLevel);

          // Must have open gap and satisfied prerequisites
          if (gap > 0 && isReady(model, profile, sSlug)) {
            let skillMeta = null;
            if (model.skills instanceof Map) {
              skillMeta = model.skills.get(sSlug);
            } else if (Array.isArray(model.skills)) {
              skillMeta = model.skills.find((s) => s.slug === sSlug);
            }

            const reasons = typeof eng.reasonsFor === 'function'
              ? eng.reasonsFor(model, profile, sSlug)
              : ['HIGH_IMPORTANCE'];

            readyCandidateItems.push({
              skill: {
                slug: sSlug,
                name: skillMeta?.name || sSlug,
                category: skillMeta?.category || 'general',
              },
              score: Number((item.score ?? 0.8).toFixed(2)),
              isReadyNow: true,
              reasons,
            });

            if (readyCandidateItems.length >= limit) {
              break;
            }
          }
        }

        if (readyCandidateItems.length > 0) {
          return {
            strategy: 'ml',
            modelVersion: mlRes.modelVersion || 'v1',
            fallbackReason: null,
            items: readyCandidateItems,
          };
        }
      }
    } catch {
      // Catch and fall back to rule baseline below
    }
  }

  // Fallback to pure rule-based engine
  const fallbackReason = strategy === 'ml' || strategy === 'auto' ? 'ML_UNAVAILABLE' : null;
  const ruleNext = typeof eng.getNextSkills === 'function'
    ? eng.getNextSkills(model, profile, limit)
    : engineGetNextSkills(model, profile, limit);

  const items = ruleNext.map((item) => {
    const s = item.skill || item;
    return {
      skill: {
        slug: s.slug,
        name: s.name,
        category: s.category || 'general',
      },
      score: Number((item.score ?? item.priority ?? 0.8).toFixed(2)),
      isReadyNow: true,
      reasons: item.reasons || ['HIGH_IMPORTANCE'],
    };
  });

  return {
    strategy: 'rule',
    modelVersion: null,
    fallbackReason,
    items,
  };
}

export default {
  getNextSkills,
};
