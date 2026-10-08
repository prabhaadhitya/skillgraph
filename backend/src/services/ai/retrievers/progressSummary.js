import {
  resolveUserTargetCareerSlug,
  getCareerModelSafe,
} from './helpers.js';

/**
 * Fact retriever for intent: "progress_summary".
 * Retrieves the student's progress summary: current fit score, delta from previous snapshot,
 * mastery breakdown (strong/developing/missing), recent skill changes, and next recommended skills.
 *
 * @param {Object} deps - Injected dependencies
 * @param {string} userId - Caller user ID
 * @param {Object} params - Intent parameters { careerSlug?: string }
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function retrieveProgressSummary(deps, userId, params = {}) {
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

    // Read only caller's profile and progress
    const profile = (await deps.profileService?.getProfileMap(userId)) || {};
    const progress = (await deps.progressService?.getProgress(userId)) || {
      history: [],
      alignment: [],
    };

    // Current fit calculation
    let currentScore = 50;
    if (typeof deps.engine?.computeFit === 'function') {
      const fitRes = deps.engine.computeFit(model, profile);
      currentScore = fitRes.fitScore;
    }

    // Previous snapshot score
    const careerSnapshots = (progress.alignment || []).filter(
      (s) => !s.careerSlug || s.careerSlug === career.slug || s.careerSlug === careerSlug,
    );
    const previousScore = careerSnapshots.length > 1
      ? careerSnapshots[1].fitScore
      : (careerSnapshots.length === 1 ? careerSnapshots[0].fitScore : null);

    const delta = previousScore != null ? currentScore - previousScore : 0;

    // Summary counts
    let strong = 0;
    let developing = 0;
    let missing = 0;
    const careerSkills = model.careerSkillsList || [];
    const total = careerSkills.length;

    for (const cs of careerSkills) {
      const slug = cs.skillSlug;
      const prof = profile[slug] ?? 0;
      const req = cs.requiredLevel ?? 1;
      const gap = Math.max(0, req - prof);

      if (gap === 0) {
        strong += 1;
      } else if (prof > 0) {
        developing += 1;
      } else {
        missing += 1;
      }
    }

    // Recent skill changes from caller's history
    const recentChanges = (progress.history || []).slice(0, 3).map((h) => ({
      slug: h.skill?.slug || h.slug || 'unknown',
      name: h.skill?.name || h.name || h.skill?.slug || h.slug || 'Skill',
      previousLevel: h.previousLevel ?? 0,
      currentLevel: h.currentLevel ?? 0,
    }));

    // Next recommended skills
    let nextSkillsRaw = [];
    if (typeof deps.engine?.getNextSkills === 'function') {
      nextSkillsRaw = deps.engine.getNextSkills(model, profile, 3);
    }
    const nextSkills = nextSkillsRaw.map((item) => item.skill?.name || item.name || item.skill?.slug || item.slug);
    const nextSkillSlugs = nextSkillsRaw.map((item) => item.skill?.slug || item.slug).filter(Boolean);

    const facts = {
      career: {
        slug: career.slug || careerSlug,
        name: career.name || careerSlug,
      },
      fit: {
        score: currentScore,
        previousScore,
        delta,
      },
      summary: {
        strong,
        developing,
        missing,
        total,
      },
      recentChanges,
      nextSkills,
    };

    const grounding = {
      skills: Array.from(
        new Set([...nextSkillSlugs, ...recentChanges.map((c) => c.slug)]),
      ).filter((s) => s && s !== 'unknown'),
      careers: [career.slug || careerSlug],
    };

    return { facts, grounding };
  } catch {
    return { needsClarification: true };
  }
}

export default retrieveProgressSummary;
