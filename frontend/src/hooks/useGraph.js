import { useQuery } from '@tanstack/react-query';
import { getGraph } from '../services/analysisService.js';

/**
 * Hook to fetch skill graph for a career with optional related links.
 *
 * @param {string} [career] - Target career slug
 * @param {object} [options={}] - Query options
 * @param {boolean} [options.includeRelated=false] - Whether to include related links
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useGraph(career, options = {}) {
  const { includeRelated = false } = options;

  return useQuery({
    queryKey: ['graph', career || null, { includeRelated }],
    queryFn: () => getGraph(career, { includeRelated }),
    staleTime: 5 * 60 * 1000,
  });
}

export default useGraph;
