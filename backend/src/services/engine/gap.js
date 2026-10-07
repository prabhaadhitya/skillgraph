import { getGapStatus } from '../../utils/gapStatus.js';
import { isReady } from './graph.js';
import { computePriorities, compareCandidates } from './priority.js';

/**
 * Compute skill gap analysis and summary breakdown for a student's profile.
 *
 * Rules (see docs/API.md §6 and ARCHITECTURE.md §5.2):
 * - Summary partition:
 *   - missing: proficiency === 0
 *   - strong: proficiency > 0 and gap === 0
 *   - developing: proficiency > 0 and gap > 0
 *   - total: total skills required by career (strong + developing + missing === total)
 * - Items:
 *   - skills with gap > 0 sorted by priority desc (tie-break difficulty asc, name asc)
 *   - skills with gap === 0 sorted by importance desc, then name asc
 *   - priority is 0 for skills with gap === 0
 *
 * @param {Object} model - Career model
 * @param {Record<string, number>} profile - Student profile (slug -> 0..5)
 * @returns {{ summary: { strong: number, developing: number, missing: number, total: number }, items: Array<Object> }}
 */
export function computeGapItems(model, profile) {
  let strong = 0;
  let developing = 0;
  let missing = 0;

  const priorities = computePriorities(model, profile);
  const gapItems = [];
  const noGapItems = [];

  for (const cs of model.careerSkillsList) {
    const slug = cs.skillSlug;
    const skill = model.skills.get(slug);
    const proficiency = profile[slug] ?? 0;
    const requiredLevel = cs.requiredLevel;
    const gap = Math.max(0, requiredLevel - proficiency);
    const importance = cs.importance;

    if (proficiency === 0) {
      missing += 1;
    } else if (gap === 0) {
      strong += 1;
    } else {
      developing += 1;
    }

    const item = {
      skill: {
        slug: skill?.slug ?? slug,
        name: skill?.name ?? slug,
        category: skill?.category ?? '',
      },
      proficiency,
      requiredLevel,
      gap,
      importance,
      status: getGapStatus(gap),
      isMissing: proficiency === 0,
      isReady: isReady(model, profile, slug),
      priority: gap > 0 ? Number((priorities.get(slug) ?? 0).toFixed(2)) : 0,
    };

    if (gap > 0) {
      gapItems.push(item);
    } else {
      noGapItems.push(item);
    }
  }

  gapItems.sort((a, b) => compareCandidates(a.skill.slug, b.skill.slug, priorities, model));

  noGapItems.sort((a, b) => {
    if (Math.abs(b.importance - a.importance) > 1e-9) {
      return b.importance - a.importance;
    }
    return a.skill.name.localeCompare(b.skill.name);
  });

  return {
    summary: {
      strong,
      developing,
      missing,
      total: model.careerSkillsList.length,
    },
    items: [...gapItems, ...noGapItems],
  };
}

export default {
  computeGapItems,
};
