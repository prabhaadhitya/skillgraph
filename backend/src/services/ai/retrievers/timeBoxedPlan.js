import {
  resolveUserTargetCareerSlug,
  getCareerModelSafe,
} from './helpers.js';
import { EFFORT_POINTS_PER_WEEK } from '../../../config/constants.js';

/**
 * Fact retriever for intent: "time_boxed_plan".
 * Builds a learning path constrained to a given number of weeks (capacity = weeks * EFFORT_POINTS_PER_WEEK).
 *
 * @param {Object} deps - Injected dependencies
 * @param {string} userId - Caller user ID
 * @param {Object} params - Intent parameters { weeks?: number, careerSlug?: string }
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function retrieveTimeBoxedPlan(deps, userId, params = {}) {
  try {
    const careerSlug = await resolveUserTargetCareerSlug(deps, userId, params?.careerSlug);
    if (!careerSlug) {
      return { needsClarification: true };
    }

    const careerData = await getCareerModelSafe(deps, careerSlug);
    if (!careerData || !careerData.model) {
      return { needsClarification: true };
    }

    const { career, model } = careerData;

    // Read only caller's profile
    const profile = (await deps.profileService?.getProfileMap(userId)) || {};

    let weeks = Number(params?.weeks);
    if (!weeks || isNaN(weeks) || weeks < 1) {
      weeks = 8;
    }
    weeks = Math.min(52, Math.max(1, Math.round(weeks)));

    const rate = EFFORT_POINTS_PER_WEEK || 6;
    const capacityPoints = weeks * rate;

    // Build path & plan within budget
    let path = { steps: [] };
    if (typeof deps.engine?.buildLearningPath === 'function') {
      path = deps.engine.buildLearningPath(model, profile);
    }

    let budgeted = { steps: path.steps || [] };
    if (typeof deps.engine?.planWithinBudget === 'function') {
      budgeted = deps.engine.planWithinBudget(path, weeks, rate);
    }

    const plannedSteps = (budgeted.steps || []).map((s, idx) => ({
      order: idx + 1,
      slug: s.skill?.slug || s.slug,
      name: s.skill?.name || s.name || s.skill?.slug || s.slug,
      fromLevel: s.fromLevel ?? 0,
      toLevel: s.toLevel ?? 1,
      effortPoints: s.effortPoints ?? 1,
    }));

    const allSteps = path.steps || [];
    const later = allSteps.slice(plannedSteps.length).map((s) => s.skill?.name || s.name || s.skill?.slug || s.slug);

    const facts = {
      career: {
        slug: career.slug || careerSlug,
        name: career.name || careerSlug,
      },
      weeks,
      capacityPoints,
      steps: plannedSteps,
      later,
      totalSteps: allSteps.length,
    };

    const grounding = {
      skills: plannedSteps.map((s) => s.slug).filter(Boolean),
      careers: [career.slug || careerSlug],
    };

    return { facts, grounding };
  } catch {
    return { needsClarification: true };
  }
}

export default retrieveTimeBoxedPlan;
