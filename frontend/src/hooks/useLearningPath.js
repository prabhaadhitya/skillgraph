import { useQuery } from '@tanstack/react-query';
import { getLearningPath } from '../services/analysisService.js';

/**
 * Hook to fetch ordered learning path for a career.
 *
 * @param {string} [career] - Target career slug
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useLearningPath(career) {
  return useQuery({
    queryKey: ['path', career || null],
    queryFn: () => getLearningPath(career),
    staleTime: 5 * 60 * 1000,
  });
}

export default useLearningPath;
