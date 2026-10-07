import { describe, it, expect, vi } from 'vitest';

vi.mock('./api.js', () => ({
  api: {
    get: vi.fn(),
  },
  USE_MOCKS: true,
}));

import { getInsights } from './insightsService.js';
import mockInsights from '../mocks/insights.mock.json';

describe('insightsService', () => {
  it('returns mock insights data in mock mode', async () => {
    const res = await getInsights();
    expect(res).toEqual(mockInsights);
    expect(res.categoryDistribution).toHaveLength(6);
    expect(res.alignmentHistory).toHaveLength(4);
    expect(res.topMissing).toHaveLength(5);
  });
});
