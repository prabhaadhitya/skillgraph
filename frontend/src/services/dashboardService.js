import { useQuery } from '@tanstack/react-query';
import { api, USE_MOCKS } from './api.js';
import mockDashboardData from '../mocks/dashboard.mock.json';

/**
 * Fetch dashboard analysis data.
 * GET /analysis/dashboard
 *
 * @returns {Promise<object>} Dashboard payload
 */
export async function getDashboard() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockDashboardData));
  }
  return api.get('/analysis/dashboard');
}

/**
 * Hook to fetch student dashboard analysis with TanStack Query.
 * Query key: ['dashboard']
 *
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60 * 1000,
  });
}

export default {
  getDashboard,
  useDashboard,
};
