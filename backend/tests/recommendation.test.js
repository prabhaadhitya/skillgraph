import { describe, it, expect, vi } from 'vitest';
import engine from '../src/services/engine/index.js';
import { getNextSkills } from '../src/services/recommendation.service.js';

describe('services/recommendation.service.js', () => {
  // Test career model with prerequisites: python -> numpy -> ml
  const modelMLE = engine.buildCareerModel({
    careerSlug: 'ml-engineer',
    skills: [
      { slug: 'python', name: 'Python', category: 'programming', difficulty: 2 },
      { slug: 'numpy', name: 'NumPy', category: 'data-analytics', difficulty: 2 },
      { slug: 'ml', name: 'Machine Learning', category: 'machine-learning', difficulty: 3 },
      { slug: 'stats', name: 'Statistics', category: 'data-analytics', difficulty: 3 },
    ],
    edges: [
      { source: 'python', target: 'numpy', type: 'PREREQUISITE' },
      { source: 'numpy', target: 'ml', type: 'PREREQUISITE' },
    ],
    careerSkills: [
      { skillSlug: 'python', importance: 0.9, requiredLevel: 3 },
      { skillSlug: 'numpy', importance: 0.8, requiredLevel: 3 },
      { skillSlug: 'ml', importance: 0.95, requiredLevel: 4 },
      { skillSlug: 'stats', importance: 0.7, requiredLevel: 3 },
    ],
  });

  const mockCareerModelService = {
    getCareerModel: vi.fn(async (slug) => ({
      career: { slug, name: 'Machine Learning Engineer' },
      model: modelMLE,
    })),
  };

  const mockProfileService = {
    getProfileMap: vi.fn(async (userId) => {
      if (userId === 'user-beginner') {
        // python 1 (gap 2), numpy 0, ml 0, stats 0
        return { python: 1 };
      }
      if (userId === 'user-intermediate') {
        // python 3 (met), numpy 1 (gap 2), ml 0 (unready), stats 1 (gap 2)
        return { python: 3, numpy: 1, stats: 1 };
      }
      return {};
    }),
  };

  describe('Strategy: rule', () => {
    it('returns rule engine recommendations with strategy "rule" and fallbackReason null', async () => {
      const result = await getNextSkills('user-beginner', 'ml-engineer', {
        strategy: 'rule',
        limit: 2,
        deps: {
          careerModelService: mockCareerModelService,
          profileService: mockProfileService,
          engine,
        },
      });

      expect(result.strategy).toBe('rule');
      expect(result.modelVersion).toBeNull();
      expect(result.fallbackReason).toBeNull();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(result.items[0]).toHaveProperty('skill');
      expect(result.items[0]).toHaveProperty('score');
      expect(result.items[0].isReadyNow).toBe(true);
    });
  });

  describe('Strategy: ml (success)', () => {
    it('returns ML recommendations filtered by prerequisite readiness', async () => {
      const mockMlClient = {
        recommend: vi.fn(async () => ({
          modelVersion: 'v1.0-synthetic',
          items: [
            // ML tries to recommend 'ml' first, but user has numpy 1, so ml is NOT ready!
            { skillSlug: 'ml', score: 0.99 },
            // 'numpy' is ready (python is 3) and has gap (required 3, current 1)
            { skillSlug: 'numpy', score: 0.88 },
            // 'stats' is ready and has gap
            { skillSlug: 'stats', score: 0.77 },
          ],
        })),
      };

      const result = await getNextSkills('user-intermediate', 'ml-engineer', {
        strategy: 'ml',
        limit: 2,
        deps: {
          careerModelService: mockCareerModelService,
          profileService: mockProfileService,
          engine,
          mlClient: mockMlClient,
        },
      });

      expect(result.strategy).toBe('ml');
      expect(result.modelVersion).toBe('v1.0-synthetic');
      expect(result.fallbackReason).toBeNull();
      // 'ml' must NOT be in the result because its prerequisite (numpy) is unmet
      expect(result.items.map((i) => i.skill.slug)).not.toContain('ml');
      expect(result.items[0].skill.slug).toBe('numpy');
      expect(result.items[0].score).toBe(0.88);
      expect(result.items[0].isReadyNow).toBe(true);
    });
  });

  describe('L7: ML service down / fails -> rule fallback', () => {
    it('falls back to rule engine with strategy "rule" and fallbackReason "ML_UNAVAILABLE" when ML rejects', async () => {
      const failingMlClient = {
        recommend: vi.fn(async () => {
          throw new Error('Connection refused: ECONNREFUSED on port 8000');
        }),
      };

      const result = await getNextSkills('user-intermediate', 'ml-engineer', {
        strategy: 'ml',
        limit: 3,
        deps: {
          careerModelService: mockCareerModelService,
          profileService: mockProfileService,
          engine,
          mlClient: failingMlClient,
        },
      });

      expect(result.strategy).toBe('rule');
      expect(result.modelVersion).toBeNull();
      expect(result.fallbackReason).toBe('ML_UNAVAILABLE');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].isReadyNow).toBe(true);
    });

    it('falls back to rule engine with fallbackReason "ML_UNAVAILABLE" in auto strategy if ML returns empty', async () => {
      const emptyMlClient = {
        recommend: vi.fn(async () => ({ modelVersion: 'v1', items: [] })),
      };

      const result = await getNextSkills('user-intermediate', 'ml-engineer', {
        strategy: 'auto',
        limit: 3,
        deps: {
          careerModelService: mockCareerModelService,
          profileService: mockProfileService,
          engine,
          mlClient: emptyMlClient,
        },
      });

      expect(result.strategy).toBe('rule');
      expect(result.fallbackReason).toBe('ML_UNAVAILABLE');
      expect(result.items.length).toBeGreaterThan(0);
    });
  });
});
