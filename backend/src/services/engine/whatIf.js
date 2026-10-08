import { computeFit } from './fit.js';
import { getNextSkills } from './priority.js';

/**
 * Pure function: Compute "What-If" analysis comparing a student's current career goal
 * against an alternative target career using the student's existing skill profile.
 *
 * Requirements:
 * - Must NOT mutate any input (model, profile, newModel).
 * - current: { score, band }
 * - projected: { score, band }
 * - delta: projected.score - current.score
 * - topPriorities: up to 3 highest priority ready skills in the alternative career
 * - newlyRequired: array of skill slugs required in newModel that are not in model
 *
 * @param {Object} model - Current career model
 * @param {Record<string, number>} profile - Student profile (skillSlug -> level)
 * @param {Object} newModel - Alternative career model
 * @returns {{
 *   current: { score: number, band: string },
 *   projected: { score: number, band: string },
 *   delta: number,
 *   topPriorities: Array<Object>,
 *   newlyRequired: Array<string>
 * }}
 */
export function computeWhatIf(model, profile, newModel) {
  if (!model || !newModel) {
    throw new Error('Both model and newModel are required for computeWhatIf');
  }

  const currentFit = computeFit(model, profile || {});
  const projectedFit = computeFit(newModel, profile || {});

  const currentScore = currentFit.fitScore;
  const projectedScore = projectedFit.fitScore;
  const delta = projectedScore - currentScore;

  // Top 3 priority ready skills for the alternative career
  const nextSkills = getNextSkills(newModel, profile || {}, 3);
  const topPriorities = nextSkills.map((item) => ({
    ...item,
    slug: item.skill?.slug || item.slug,
    name: item.skill?.name || item.name,
  }));

  // Identify skills required by newModel that are not required by model
  const currentSlugs = model.careerSlugs instanceof Set
    ? model.careerSlugs
    : new Set((model.careerSkillsList || []).map((cs) => cs.skillSlug));

  const newlyRequired = [];
  const newCareerSkills = newModel.careerSkillsList || [];
  for (const cs of newCareerSkills) {
    const slug = cs.skillSlug;
    if (slug && !currentSlugs.has(slug)) {
      newlyRequired.push(slug);
    }
  }

  return {
    current: {
      score: currentScore,
      band: currentFit.band,
    },
    projected: {
      score: projectedScore,
      band: projectedFit.band,
    },
    delta,
    topPriorities,
    newlyRequired,
  };
}

export default {
  computeWhatIf,
};
