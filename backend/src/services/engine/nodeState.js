/**
 * Determine node visual state for the skill graph.
 *
 * Formula / Priority (see ARCHITECTURE.md §5.7):
 * - "not_relevant" if skill is not part of the career (isRelevant === false)
 * - "recommended"  if skill is in top-k recommended next skills
 * - "mastered"     else if gap === 0 (proficiency >= requiredLevel)
 * - "partial"      else if proficiency > 0
 * - "missing"      else (proficiency === 0)
 *
 * @param {Object} params
 * @param {number} params.gap - Non-negative difference between required and current level
 * @param {number} params.proficiency - Student's current skill level (0..5)
 * @param {boolean} [params.isRecommended=false] - Whether skill is among top next recommendations
 * @param {boolean} [params.isRelevant=true] - Whether skill belongs to the target career
 * @returns {'recommended' | 'mastered' | 'partial' | 'missing' | 'not_relevant'}
 */
export function getNodeState({ gap, proficiency, isRecommended = false, isRelevant = true }) {
  if (!isRelevant) {
    return 'not_relevant';
  }
  if (isRecommended) {
    return 'recommended';
  }
  if (gap === 0) {
    return 'mastered';
  }
  if (proficiency > 0) {
    return 'partial';
  }
  return 'missing';
}

export default {
  getNodeState,
};
