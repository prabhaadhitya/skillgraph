import { useQuery } from '@tanstack/react-query';
import { getSkillDetail } from '../services/analysisService.js';

/**
 * Hook to fetch detailed info for a single skill.
 *
 * @param {string} [slug] - Skill slug
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useSkillDetail(slug) {
  return useQuery({
    queryKey: ['skill', slug || null],
    queryFn: () => getSkillDetail(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export default useSkillDetail;
