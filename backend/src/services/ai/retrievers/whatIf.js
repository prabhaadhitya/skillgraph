import {
  resolveUserTargetCareerSlug,
  getCareerModelSafe,
  isCareerSlugAllowed,
  getSkillData,
} from './helpers.js';

/**
 * Fact retriever for intent: "what_if".
 * Evaluates the impact on career alignment and learning path if the student switched target careers.
 *
 * @param {Object} deps - Injected dependencies
 * @param {string} userId - Caller user ID
 * @param {Object} params - Intent parameters { careerSlug: string, currentCareerSlug?: string }
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function retrieveWhatIf(deps, userId, params = {}) {
  try {
    const altCareerSlug = params?.careerSlug;
    if (!altCareerSlug || typeof altCareerSlug !== 'string' || !altCareerSlug.trim()) {
      return { needsClarification: true };
    }

    const isAllowed = await isCareerSlugAllowed(deps, altCareerSlug.trim());
    if (!isAllowed) {
      return { needsClarification: true };
    }

    const currentCareerSlug = await resolveUserTargetCareerSlug(deps, userId, params?.currentCareerSlug);
    if (!currentCareerSlug) {
      return { needsClarification: true };
    }

    const currentData = await getCareerModelSafe(deps, currentCareerSlug);
    const altData = await getCareerModelSafe(deps, altCareerSlug);

    if (!currentData || !currentData.model || !altData || !altData.model) {
      return { needsClarification: true };
    }

    // Read only caller's profile
    const profile = (await deps.profileService?.getProfileMap(userId)) || {};

    let currentScore = 50;
    let altScore = 50;
    let delta = 0;
    let newlyRequired = [];
    let topPriority = [];
    let topPrioritySlugs = [];

    if (typeof deps.engine?.computeWhatIf === 'function') {
      const whatIfRes = deps.engine.computeWhatIf(currentData.model, profile, altData.model);
      currentScore = whatIfRes.current?.score ?? 50;
      altScore = whatIfRes.projected?.score ?? 50;
      delta = whatIfRes.delta ?? (altScore - currentScore);

      newlyRequired = (whatIfRes.newlyRequired || []).map((slug) => {
        const s = getSkillData(altData.model, slug);
        const cs = altData.model.careerSkillMap instanceof Map
          ? altData.model.careerSkillMap.get(slug)
          : (altData.model.careerSkillsList || []).find((c) => c.skillSlug === slug);
        return {
          slug,
          name: s.name || slug,
          requiredLevel: cs?.requiredLevel ?? 1,
        };
      });

      topPriority = (whatIfRes.topPriorities || []).map((p) => p.name || p.slug);
      topPrioritySlugs = (whatIfRes.topPriorities || []).map((p) => p.slug || p.skill?.slug).filter(Boolean);
    } else {
      // Fallback if engine.computeWhatIf is missing
      if (typeof deps.engine?.computeFit === 'function') {
        const cFit = deps.engine.computeFit(currentData.model, profile);
        const aFit = deps.engine.computeFit(altData.model, profile);
        currentScore = cFit.fitScore;
        altScore = aFit.fitScore;
        delta = altScore - currentScore;
      }
    }

    // Compute path step counts
    let currentPathSteps = 0;
    let altPathSteps = 0;
    if (typeof deps.engine?.buildLearningPath === 'function') {
      try {
        const cPath = deps.engine.buildLearningPath(currentData.model, profile);
        currentPathSteps = cPath?.steps?.length || 0;
        const aPath = deps.engine.buildLearningPath(altData.model, profile);
        altPathSteps = aPath?.steps?.length || 0;
      } catch {
        // Ignore path calculation error
      }
    }

    const facts = {
      current: {
        career: {
          slug: currentData.career.slug || currentCareerSlug,
          name: currentData.career.name || currentCareerSlug,
        },
        fitScore: currentScore,
        pathSteps: currentPathSteps,
      },
      alternative: {
        career: {
          slug: altData.career.slug || altCareerSlug,
          name: altData.career.name || altCareerSlug,
        },
        fitScore: altScore,
        pathSteps: altPathSteps,
      },
      delta,
      newlyRequired,
      topPriority,
    };

    const grounding = {
      skills: Array.from(new Set([...newlyRequired.map((s) => s.slug), ...topPrioritySlugs])),
      careers: [currentData.career.slug || currentCareerSlug, altData.career.slug || altCareerSlug],
    };

    return { facts, grounding };
  } catch {
    return { needsClarification: true };
  }
}

export default retrieveWhatIf;
