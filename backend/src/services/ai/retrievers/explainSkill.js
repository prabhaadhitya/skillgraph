import {
  getLevelLabel,
  resolveUserTargetCareerSlug,
  getCareerModelSafe,
  isSkillSlugAllowed,
  getSkillData,
} from './helpers.js';

/**
 * Fact retriever for intent: "explain_skill".
 * Retrieves the student's status on a specific skill in their target career,
 * direct prerequisites, what it unlocks, reason codes, and placement in the learning path.
 *
 * @param {Object} deps - Injected dependencies { careerModelService, profileService, engine, ... }
 * @param {string} userId - Caller user ID (only caller's data is retrieved)
 * @param {Object} params - Intent parameters { skillSlug: string, careerSlug?: string }
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function retrieveExplainSkill(deps, userId, params = {}) {
  try {
    const skillSlug = params?.skillSlug;
    if (!skillSlug || typeof skillSlug !== 'string' || !skillSlug.trim()) {
      return { needsClarification: true };
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

    // Check allow-list for skill slug
    const isAllowed = await isSkillSlugAllowed(deps, skillSlug, model);
    if (!isAllowed) {
      return { needsClarification: true };
    }

    // Skill must be known in the career model or catalog
    const skill = getSkillData(model, skillSlug);

    // Read only the caller's profile
    const profile = (await deps.profileService?.getProfileMap(userId)) || {};

    const proficiency = profile[skillSlug] ?? 0;
    const cs = model.careerSkillMap instanceof Map
      ? model.careerSkillMap.get(skillSlug)
      : (model.careerSkillsList || []).find((c) => c.skillSlug === skillSlug);

    const requiredLevel = cs?.requiredLevel ?? 1;
    const importance = cs?.importance ?? 0.5;
    const gap = Math.max(0, requiredLevel - proficiency);
    const status = gap === 0 ? 'strong' : proficiency > 0 ? 'developing' : 'missing';

    // Reasons from engine
    const reasons = typeof deps.engine?.reasonsFor === 'function'
      ? deps.engine.reasonsFor(model, profile, skillSlug)
      : ['REQUIRED_BY_CAREER'];

    // Direct prerequisites
    const prereqSlugs = model.directPrereqs instanceof Map
      ? model.directPrereqs.get(skillSlug) || []
      : [];

    const prerequisites = prereqSlugs.map((pSlug) => {
      const pSkill = getSkillData(model, pSlug);
      const pCs = model.careerSkillMap instanceof Map
        ? model.careerSkillMap.get(pSlug)
        : (model.careerSkillsList || []).find((c) => c.skillSlug === pSlug);
      const pReq = pCs?.requiredLevel ?? 1;
      const pProf = profile[pSlug] ?? 0;
      return {
        slug: pSlug,
        name: pSkill.name || pSlug,
        proficiency: pProf,
        requiredLevel: pReq,
        met: pProf >= pReq,
      };
    });

    // Unlocks (direct dependents)
    const dependentSlugs = model.directDependents instanceof Map
      ? model.directDependents.get(skillSlug) || []
      : [];

    const unlocks = dependentSlugs.map((dSlug) => {
      const dSkill = getSkillData(model, dSlug);
      return dSkill.name || dSlug;
    });

    // Placement in learning path
    let inPath = null;
    if (typeof deps.engine?.buildLearningPath === 'function') {
      try {
        const path = deps.engine.buildLearningPath(model, profile);
        if (Array.isArray(path?.steps)) {
          const stepIndex = path.steps.findIndex(
            (s) => (s.skill?.slug || s.slug) === skillSlug,
          );
          if (stepIndex >= 0) {
            inPath = {
              order: stepIndex + 1,
              totalSteps: path.steps.length,
            };
          }
        }
      } catch {
        // Path calculation error fallback
      }
    }

    // Priority if available
    let priority = 0;
    if (typeof deps.engine?.computePriorities === 'function') {
      try {
        const pMap = deps.engine.computePriorities(model, profile);
        if (pMap instanceof Map && pMap.has(skillSlug)) {
          priority = Number((pMap.get(skillSlug) || 0).toFixed(2));
        }
      } catch {
        // Ignore
      }
    }

    const facts = {
      career: {
        slug: career.slug || careerSlug,
        name: career.name || careerSlug,
      },
      skill: {
        slug: skill.slug,
        name: skill.name,
        category: skill.category,
      },
      you: {
        proficiency,
        levelLabel: getLevelLabel(proficiency),
        status,
        requiredLevel,
        importance,
      },
      prerequisites,
      unlocks,
      requiredForCareers: [career.name || career.slug || careerSlug],
      priority,
      reasons,
      inPath,
    };

    const grounding = {
      skills: Array.from(new Set([skillSlug, ...prereqSlugs, ...dependentSlugs])),
      careers: [career.slug || careerSlug],
    };

    return { facts, grounding };
  } catch {
    return { needsClarification: true };
  }
}

export default retrieveExplainSkill;
