/**
 * Generate explanatory reason codes for recommending or learning a skill.
 *
 * Rules and order (see ARCHITECTURE.md §5.5 and docs/API.md §6):
 * 1. HIGH_IMPORTANCE: importance >= 0.8
 * 2. LARGE_GAP: gap >= 3
 * 3. UNLOCKS_MANY: 3 or more descendants in the career graph have gap > 0
 * 4. QUICK_WIN: gap === 1
 * If none apply, returns ["REQUIRED_BY_CAREER"].
 *
 * @param {Object} model - Precomputed career graph model
 * @param {Record<string, number>} profile - Student skill proficiencies (slug -> 0..5)
 * @param {string} slug - Target skill slug
 * @returns {string[]} Ordered list of reason codes
 */
export function reasonsFor(model, profile, slug) {
  const cs = model.careerSkillMap.get(slug);
  const importance = cs?.importance ?? 0;
  const requiredLevel = cs?.requiredLevel ?? 0;
  const proficiency = profile[slug] ?? 0;
  const gap = Math.max(0, requiredLevel - proficiency);

  const descendants = model.descendants.get(slug) || new Set();
  let descendantsWithGap = 0;
  for (const descSlug of descendants) {
    const descCs = model.careerSkillMap.get(descSlug);
    if (!descCs) continue;
    const descProf = profile[descSlug] ?? 0;
    const descGap = Math.max(0, descCs.requiredLevel - descProf);
    if (descGap > 0) {
      descendantsWithGap += 1;
    }
  }

  const reasons = [];
  if (importance >= 0.8) {
    reasons.push('HIGH_IMPORTANCE');
  }
  if (gap >= 3) {
    reasons.push('LARGE_GAP');
  }
  if (descendantsWithGap >= 3) {
    reasons.push('UNLOCKS_MANY');
  }
  if (gap === 1) {
    reasons.push('QUICK_WIN');
  }

  if (reasons.length === 0) {
    return ['REQUIRED_BY_CAREER'];
  }

  return reasons;
}

export default {
  reasonsFor,
};
