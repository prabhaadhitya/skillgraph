import { PRIORITY_WEIGHTS } from '../../config/constants.js';
import { isReady } from './graph.js';
import { reasonsFor } from './reasons.js';

/**
 * Compare two candidate skills for sorting by priority and tie-breakers.
 *
 * Tie-break rule (see ARCHITECTURE.md §5.5 and constants tieBreak):
 * 1. Priority descending
 * 2. Difficulty ascending
 * 3. Skill name ascending (alphabetical)
 *
 * @param {string} slugA
 * @param {string} slugB
 * @param {Map<string, number>} priorities - Map of skill slug to priority score
 * @param {Object} model - Career model
 * @returns {number}
 */
export function compareCandidates(slugA, slugB, priorities, model) {
  const pA = priorities.get(slugA) ?? 0;
  const pB = priorities.get(slugB) ?? 0;

  if (Math.abs(pA - pB) > 1e-9) {
    return pB - pA;
  }

  const sA = model.skills.get(slugA);
  const sB = model.skills.get(slugB);

  const diffA = sA?.difficulty ?? 0;
  const diffB = sB?.difficulty ?? 0;
  if (diffA !== diffB) {
    return diffA - diffB;
  }

  const nameA = sA?.name ?? slugA;
  const nameB = sB?.name ?? slugB;
  return nameA.localeCompare(nameB);
}

/**
 * Compute unrounded priority scores for career skills that have gap > 0.
 *
 * Formulas (see ARCHITECTURE.md §5.4):
 * gapNorm          = gap(s) / 5
 * dependencyImpact = sum(importance(d) for d in descendants(s) with gap(d) > 0) / maxRaw
 *                    (0 if maxRaw === 0)
 * readyBonus       = isReady(s) ? 1 : 0
 * priority         = 0.30 × importance + 0.25 × gapNorm + 0.30 × dependencyImpact + 0.15 × readyBonus
 *
 * @param {Object} model - Precomputed career graph model
 * @param {Record<string, number>} profile - Student skill proficiencies (slug -> 0..5)
 * @returns {Map<string, number>} Map of skill slug -> unrounded priority
 */
export function computePriorities(model, profile) {
  const priorities = new Map();
  const gaps = new Map();

  for (const cs of model.careerSkillsList) {
    const slug = cs.skillSlug;
    const prof = profile[slug] ?? 0;
    const gap = Math.max(0, cs.requiredLevel - prof);
    if (gap > 0) {
      gaps.set(slug, gap);
    }
  }

  if (gaps.size === 0) {
    return priorities;
  }

  const rawImpacts = new Map();
  let maxRaw = 0;

  for (const [slug] of gaps) {
    let sumImp = 0;
    const descendants = model.descendants.get(slug) || new Set();
    for (const descSlug of descendants) {
      if (gaps.has(descSlug)) {
        sumImp += model.careerSkillMap.get(descSlug)?.importance ?? 0;
      }
    }
    rawImpacts.set(slug, sumImp);
    if (sumImp > maxRaw) {
      maxRaw = sumImp;
    }
  }

  const weights = PRIORITY_WEIGHTS || {
    importance: 0.3,
    gap: 0.25,
    dependencyImpact: 0.3,
    ready: 0.15,
  };

  for (const [slug, gap] of gaps) {
    const cs = model.careerSkillMap.get(slug);
    const importance = cs?.importance ?? 0;
    const gapNorm = gap / 5;
    const depImpact = maxRaw > 0 ? (rawImpacts.get(slug) ?? 0) / maxRaw : 0;
    const readyBonus = isReady(model, profile, slug) ? 1 : 0;

    const priority =
      weights.importance * importance +
      weights.gap * gapNorm +
      weights.dependencyImpact * depImpact +
      weights.ready * readyBonus;

    priorities.set(slug, priority);
  }

  return priorities;
}

/**
 * Get top ready skills recommended next for the student's profile.
 *
 * Selection & Ranking (see ARCHITECTURE.md §5.6):
 * - Must have gap > 0
 * - Must be ready under current profile (every direct prerequisite has gap 0)
 * - Sorted by priority desc (tie-break: difficulty asc, then name asc)
 * - Score rounded to 2 decimal places
 *
 * @param {Object} model - Career model
 * @param {Record<string, number>} profile - Student profile
 * @param {number} [limit=3] - Max recommendations
 * @returns {Array<{ skill: { slug: string, name: string, category: string }, score: number, isReadyNow: true, reasons: string[] }>}
 */
export function getNextSkills(model, profile, limit = 3) {
  const priorities = computePriorities(model, profile);
  const readyCandidates = [];

  for (const [slug] of priorities) {
    if (isReady(model, profile, slug)) {
      readyCandidates.push(slug);
    }
  }

  readyCandidates.sort((a, b) => compareCandidates(a, b, priorities, model));

  return readyCandidates.slice(0, limit).map((slug) => {
    const skill = model.skills.get(slug);
    const unroundedPriority = priorities.get(slug) ?? 0;
    return {
      skill: {
        slug: skill?.slug ?? slug,
        name: skill?.name ?? slug,
        category: skill?.category ?? '',
      },
      score: Number(unroundedPriority.toFixed(2)),
      isReadyNow: true,
      reasons: reasonsFor(model, profile, slug),
    };
  });
}

export default {
  compareCandidates,
  computePriorities,
  getNextSkills,
};
