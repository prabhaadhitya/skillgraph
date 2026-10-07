import { useQuery } from '@tanstack/react-query';
import { api, USE_MOCKS } from './api.js';
import mockInsightsData from '../mocks/insights.mock.json';

/**
 * Fetch student insights / analytics data.
 * GET /analysis/insights
 *
 * @returns {Promise<object>} Insights payload { categoryDistribution, alignmentHistory, topMissing }
 */
export async function getInsights() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockInsightsData));
  }
  return api.get('/analysis/insights');
}

/**
 * Hook to fetch student insights.
 * Query key: ['insights']
 *
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: getInsights,
    staleTime: 5 * 60 * 1000,
  });
}

export default {
  getInsights,
  useInsights,
};
