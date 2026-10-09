import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCareers } from '../services/catalogService.js';
import { getCareerFit, compareCareers, runWhatIf } from '../services/careerExplorerService.js';
import { patchMe } from '../services/userService.js';
import { invalidateAnalysis } from '../utils/invalidateAnalysis.js';
import { useAuth } from './useAuth.js';

/**
 * Fetch all active careers.
 */
export function useCareers() {
  return useQuery({
    queryKey: ['careers'],
    queryFn: getCareers,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch student alignment fits for multiple careers in parallel.
 * Caches results in TanStack Query.
 *
 * @param {Array<{ slug: string }>} careers
 */
export function useCareerFits(careers = []) {
  const queries = (careers || []).map((c) => ({
    queryKey: ['fit', c.slug],
    queryFn: () => getCareerFit(c.slug),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(c?.slug),
  }));

  const results = useQueries({ queries });

  const fitsMap = {};
  let isLoading = false;
  let isError = false;

  (careers || []).forEach((c, idx) => {
    const q = results[idx];
    if (q) {
      if (q.isLoading) isLoading = true;
      if (q.isError) isError = true;
      if (q.data) fitsMap[c.slug] = q.data;
    }
  });

  return { fitsMap, isLoading, isError };
}

/**
 * Fetch comparison between career A and career B.
 *
 * @param {string|null} a - Slug of career A
 * @param {string|null} b - Slug of career B
 */
export function useCareerCompare(a, b) {
  return useQuery({
    queryKey: ['career-compare', a, b],
    queryFn: () => compareCareers(a, b),
    enabled: Boolean(a && b),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to run what-if simulation for an alternative career.
 */
export function useWhatIfMutation() {
  return useMutation({
    mutationFn: (careerSlug) => runWhatIf(careerSlug),
  });
}

/**
 * Mutation to update user's target career and invalidate all analysis queries.
 */
export function useSetTargetCareer() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation({
    mutationFn: async (targetCareerSlug) => {
      const res = await patchMe({ targetCareerSlug });
      if (res?.user && auth?.setUser) {
        auth.setUser(res.user);
      }
      await invalidateAnalysis(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['fit'] });
      return res;
    },
  });
}
