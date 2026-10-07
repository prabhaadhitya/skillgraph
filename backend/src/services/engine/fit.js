import { FIT_WEIGHTS } from '../../config/constants.js';
import { isReady } from './graph.js';

/**
 * Compute career fit (estimated alignment) for a student's profile.
 *
 * Formulas (see ARCHITECTURE.md §5.3):
 * coverage   = Σ importance(s) × min(proficiency(s), requiredLevel(s)) / requiredLevel(s) ÷ Σ importance(s)
 * readiness  = Σ importance(s) × [ready(s) ? 1 : 0] ÷ Σ importance(s)
 * fitScore   = round(100 × (FIT_WEIGHTS.coverage × coverage + FIT_WEIGHTS.readiness × readiness))
 * band       = fitScore < 40 → "early" · < 70 → "developing" · else "strong"
 *
 * @param {Object} model - Precomputed career graph model
 * @param {Record<string, number>} profile - Student skill proficiencies (slug -> 0..5)
 * @returns {{ fitScore: number, coverage: number, readiness: number, band: 'early' | 'developing' | 'strong' }}
 */
export function computeFit(model, profile) {
  const { careerSkillsList, totalImportance } = model;
  if (!careerSkillsList || careerSkillsList.length === 0 || totalImportance <= 0) {
    return {
      fitScore: 0,
      coverage: 0,
      readiness: 0,
      band: 'early',
    };
  }

  let weightedCoverageSum = 0;
  let weightedReadinessSum = 0;

  for (const cs of careerSkillsList) {
    const slug = cs.skillSlug;
    const prof = profile[slug] ?? 0;
    const req = cs.requiredLevel;
    const imp = cs.importance;

    const satisfiedRatio = Math.min(prof, req) / req;
    weightedCoverageSum += imp * satisfiedRatio;

    if (isReady(model, profile, slug)) {
      weightedReadinessSum += imp;
    }
  }

  const rawCoverage = weightedCoverageSum / totalImportance;
  const rawReadiness = weightedReadinessSum / totalImportance;

  const coverage = Math.round(rawCoverage * 10000) / 10000;
  const readiness = Math.round(rawReadiness * 10000) / 10000;

  const weights = FIT_WEIGHTS || { coverage: 0.85, readiness: 0.15 };
  const fitScore = Math.round(100 * (weights.coverage * coverage + weights.readiness * readiness));

  const band = fitScore < 40 ? 'early' : fitScore < 70 ? 'developing' : 'strong';

  return {
    fitScore,
    coverage,
    readiness,
    band,
  };
}

export default {
  computeFit,
};
