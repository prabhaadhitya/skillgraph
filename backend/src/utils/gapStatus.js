export const getGapStatus = (gap) => (gap <= 0 ? 'strong' : gap === 1 ? 'developing' : gap === 2 ? 'major' : 'critical');
