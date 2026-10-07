/**
 * Map skill gap to status level.
 * @param {number} gap - The gap (requiredLevel - proficiency)
 * @returns {'strong' | 'developing' | 'major' | 'critical'}
 */
export const getGapStatus = (gap) =>
  gap <= 0 ? 'strong' : gap === 1 ? 'developing' : gap === 2 ? 'major' : 'critical';

export default getGapStatus;