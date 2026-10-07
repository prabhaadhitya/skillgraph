import { isReady } from './graph.js';
import { computePriorities, compareCandidates } from './priority.js';
import { reasonsFor } from './reasons.js';

/**
 * Build a prerequisite-aware learning path for the career goal.
 *
 * Algorithm (see ARCHITECTURE.md §5.5 and docs/API.md §6):
 * 1. Simulates progress starting from a copy of the input profile (never mutating input).
 * 2. In each iteration, candidates with gap > 0 are identified and prioritized.
 * 3. The candidate that is ready under simulated state with highest priority (and tie-breakers) is picked.
 * 4. Picked skill is marked completed (level set to requiredLevel), and priorities recomputed.
 *
 * Each step contains:
 * - order: 1-indexed sequence
 * - skill: { slug, name, category, difficulty }
 * - fromLevel: level before this step
 * - toLevel: target requiredLevel
 * - priority: unrounded priority at pick time, formatted to 2 decimals
 * - effortPoints: (toLevel - fromLevel) * difficulty
 * - isReadyNow: ready under ORIGINAL profile with gap > 0
 * - prerequisites: direct prerequisites in career with original proficiency
 * - unlocks: direct dependents in career
 * - reasons: explanatory reason codes
 *
 * @param {Object} model - Career model
 * @param {Record<string, number>} profile - Student skill proficiencies (slug -> 0..5)
 * @returns {{ totalSteps: number, totalEffortPoints: number, steps: Array<Object> }}
 */
export function buildLearningPath(model, profile) {
  const state = { ...profile };
  const steps = [];

  while (true) {
    const priorities = computePriorities(model, state);
    if (priorities.size === 0) {
      break;
    }

    const readyCandidates = [];
    for (const [slug] of priorities) {
      if (isReady(model, state, slug)) {
        readyCandidates.push(slug);
      }
    }

    if (readyCandidates.length === 0) {
      throw new Error('Deadlock: No ready skills remaining despite open gaps.');
    }

    readyCandidates.sort((a, b) => compareCandidates(a, b, priorities, model));
    const pick = readyCandidates[0];

    const skill = model.skills.get(pick);
    const cs = model.careerSkillMap.get(pick);
    const fromLevel = state[pick] ?? 0;
    const toLevel = cs?.requiredLevel ?? fromLevel;
    const difficulty = skill?.difficulty ?? 1;
    const effortPoints = (toLevel - fromLevel) * difficulty;

    const unroundedPriority = priorities.get(pick) ?? 0;
    const priority = Number(unroundedPriority.toFixed(2));

    const originalProficiency = profile[pick] ?? 0;
    const hasOriginalGap = (cs?.requiredLevel ?? 0) - originalProficiency > 0;
    const isReadyNow = isReady(model, profile, pick) && hasOriginalGap;

    const prereqSlugs = model.directPrereqs.get(pick) || [];
    const prerequisites = prereqSlugs
      .map((pSlug) => {
        const pSkill = model.skills.get(pSlug);
        return {
          slug: pSlug,
          name: pSkill?.name ?? pSlug,
          proficiency: profile[pSlug] ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const unlockSlugs = model.directDependents.get(pick) || [];
    const unlocks = unlockSlugs
      .map((dSlug) => {
        const dSkill = model.skills.get(dSlug);
        return {
          slug: dSlug,
          name: dSkill?.name ?? dSlug,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const reasons = reasonsFor(model, profile, pick);

    steps.push({
      order: steps.length + 1,
      skill: {
        slug: skill?.slug ?? pick,
        name: skill?.name ?? pick,
        category: skill?.category ?? '',
        difficulty,
      },
      fromLevel,
      toLevel,
      priority,
      effortPoints,
      isReadyNow,
      prerequisites,
      unlocks,
      reasons,
    });

    state[pick] = toLevel;
  }

  const totalSteps = steps.length;
  const totalEffortPoints = steps.reduce((sum, s) => sum + s.effortPoints, 0);

  return {
    totalSteps,
    totalEffortPoints,
    steps,
  };
}

export default {
  buildLearningPath,
};
