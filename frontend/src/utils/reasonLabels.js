/**
 * Mapping of backend reason codes to student-friendly display labels.
 * Used across learning path steps, next skills, and recommendations.
 */
export const REASON_LABELS = {
  HIGH_IMPORTANCE: 'High importance',
  LARGE_GAP: 'Big gap',
  UNLOCKS_MANY: 'Unlocks many skills',
  QUICK_WIN: 'Quick win',
  REQUIRED_BY_CAREER: 'Required for this career',
};

/**
 * Returns a human-friendly display label for a reason code.
 *
 * @param {string} code - Reason code (e.g., 'HIGH_IMPORTANCE')
 * @returns {string} Human-friendly label
 */
export function getReasonLabel(code) {
  if (!code) return '';
  return REASON_LABELS[code] || code.replace(/_/g, ' ').toLowerCase();
}

export default getReasonLabel;
