export const ANALYSIS_QUERY_KEYS = [
  ['dashboard'],
  ['graph'],
  ['path'],
  ['gap'],
  ['fit'],
  ['insights'],
];

/**
 * Invalidate all analysis queries across the application.
 * Used whenever a skill proficiency, target career, or profile changes.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - TanStack Query Client instance
 * @returns {Promise<void>}
 */
export async function invalidateAnalysis(queryClient) {
  if (!queryClient || typeof queryClient.invalidateQueries !== 'function') {
    return;
  }

  await Promise.all(
    ANALYSIS_QUERY_KEYS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

export default invalidateAnalysis;
