import {
  resolveUserTargetCareerSlug,
  getCareerModelSafe,
  isSkillSlugAllowed,
} from './helpers.js';

/**
 * Fact retriever for intent: "explain_recommendation".
 * Retrieves the student's estimated career alignment and next recommended skills with reasons.
 *
 * @param {Object} deps - Injected dependencies
 * @param {string} userId - Caller user ID
 * @param {Object} params - Intent parameters { skillSlug?: string, careerSlug?: string }
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function retrieveExplainRecommendation(deps, userId, params = {}) {
  try {
    // If specific skill is queried, validate allow-list
    if (params?.skillSlug) {
      const allowed = await isSkillSlugAllowed(deps, params.skillSlug);
      if (!allowed) {
        return { needsClarification: true };
      }
    }

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

    // Compute fit
    let fit = { score: 50, band: 'developing' };
    if (typeof deps.engine?.computeFit === 'function') {
      const fitRes = deps.engine.computeFit(model, profile);
      fit = {
        score: fitRes.fitScore,
        band: fitRes.band,
      };
    }

    // Get recommended next skills
    let nextSkillsRaw = [];
    if (typeof deps.engine?.getNextSkills === 'function') {
      nextSkillsRaw = deps.engine.getNextSkills(model, profile, 3);
    }

    // If a specific skill was requested in params, ensure it's included or prioritized
    if (params?.skillSlug && typeof deps.engine?.reasonsFor === 'function') {
      const targetSlug = params.skillSlug;
      const alreadyIncluded = nextSkillsRaw.some((item) => (item.skill?.slug || item.slug) === targetSlug);
      if (!alreadyIncluded) {
        const skillObj = model.skills instanceof Map
          ? model.skills.get(targetSlug)
          : (model.skills || []).find?.((s) => s.slug === targetSlug);
        if (skillObj) {
          const reasons = deps.engine.reasonsFor(model, profile, targetSlug);
          nextSkillsRaw.unshift({
            skill: skillObj,
            priority: 0.8,
            reasons,
          });
        }
      }
    }

    const nextSkills = nextSkillsRaw.map((item) => {
      const s = item.skill || item;
      return {
        slug: s.slug || item.slug,
        name: s.name || s.slug || item.name || item.slug,
        score: Number((item.priority ?? 0.8).toFixed(2)),
        reasons: item.reasons || ['REQUIRED_BY_CAREER'],
        strategy: 'rule',
      };
    });

    const facts = {
      career: {
        slug: career.slug || careerSlug,
        name: career.name || careerSlug,
      },
      fit,
      nextSkills,
    };

    const grounding = {
      skills: nextSkills.map((s) => s.slug).filter(Boolean),
      careers: [career.slug || careerSlug],
    };

    return { facts, grounding };
  } catch {
    return { needsClarification: true };
  }
}

export default retrieveExplainRecommendation;
