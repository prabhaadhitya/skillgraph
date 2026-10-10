import { describe, it, expect, vi } from 'vitest';
import engine from '../../../src/services/engine/index.js';
import { isStrongMlInternalKey, envSchema } from '../../../src/config/env.js';
import { createMlClient } from '../../../src/services/ml/mlClient.js';
import { getNextSkills } from '../../../src/services/recommendation.service.js';

describe('ML Internal Key Security & Fallback', () => {
  describe('isStrongMlInternalKey helper', () => {
    it('rejects empty, null, and non-string values', () => {
      expect(isStrongMlInternalKey('')).toBe(false);
      expect(isStrongMlInternalKey(null)).toBe(false);
      expect(isStrongMlInternalKey(undefined)).toBe(false);
      expect(isStrongMlInternalKey(12345)).toBe(false);
    });

    it('rejects keys shorter than 16 characters', () => {
      expect(isStrongMlInternalKey('short')).toBe(false);
      expect(isStrongMlInternalKey('123456789012345')).toBe(false); // 15 chars
    });

    it('rejects known weak placeholders regardless of case', () => {
      expect(isStrongMlInternalKey('dev-internal-key')).toBe(false);
      expect(isStrongMlInternalKey('DEV-INTERNAL-KEY')).toBe(false);
      expect(isStrongMlInternalKey('your_ml_internal_key_placeholder')).toBe(false);
      expect(isStrongMlInternalKey('changeme')).toBe(false);
      expect(isStrongMlInternalKey('password')).toBe(false);
      expect(isStrongMlInternalKey('secret')).toBe(false);
    });

    it('accepts strong secrets of 16 characters or more', () => {
      expect(isStrongMlInternalKey('sg-ml-secret-key-2026-secure')).toBe(true);
      expect(isStrongMlInternalKey('a_very_long_secure_random_key_123456')).toBe(true);
    });
  });

  describe('envSchema production validation for ML_INTERNAL_KEY', () => {
    const validBaseEnv = {
      MONGODB_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'a_very_long_jwt_secret_min_32_characters_long_12345',
    };

    it('fails startup in production if ML_SERVICE_URL is set without ML_INTERNAL_KEY', () => {
      const parsed = envSchema.safeParse({
        ...validBaseEnv,
        NODE_ENV: 'production',
        ML_SERVICE_URL: 'https://ml.example.com',
      });

      expect(parsed.success).toBe(false);
      const errors = parsed.error.issues.map((i) => i.message);
      expect(errors.some((m) => m.includes('ML_INTERNAL_KEY is required and must be a strong secret'))).toBe(true);
    });

    it('fails startup in production if ML_INTERNAL_KEY is the weak placeholder dev-internal-key', () => {
      const parsed = envSchema.safeParse({
        ...validBaseEnv,
        NODE_ENV: 'production',
        ML_SERVICE_URL: 'https://ml.example.com',
        ML_INTERNAL_KEY: 'dev-internal-key',
      });

      expect(parsed.success).toBe(false);
      const errors = parsed.error.issues.map((i) => i.message);
      expect(errors.some((m) => m.includes('not a placeholder'))).toBe(true);
    });

    it('fails startup in production if ML_INTERNAL_KEY is too short', () => {
      const parsed = envSchema.safeParse({
        ...validBaseEnv,
        NODE_ENV: 'production',
        ML_SERVICE_URL: 'https://ml.example.com',
        ML_INTERNAL_KEY: 'too-short-key',
      });

      expect(parsed.success).toBe(false);
    });

    it('succeeds in production when ML_INTERNAL_KEY is a strong secret', () => {
      const parsed = envSchema.safeParse({
        ...validBaseEnv,
        NODE_ENV: 'production',
        ML_SERVICE_URL: 'https://ml.example.com',
        ML_INTERNAL_KEY: 'sg-ml-production-secret-token-12345',
      });

      expect(parsed.success).toBe(true);
      expect(parsed.data.ML_INTERNAL_KEY).toBe('sg-ml-production-secret-token-12345');
    });

    it('allows missing ML_INTERNAL_KEY in development mode (gracefully disables integration)', () => {
      const parsed = envSchema.safeParse({
        ...validBaseEnv,
        NODE_ENV: 'development',
        ML_SERVICE_URL: 'http://localhost:8000',
      });

      expect(parsed.success).toBe(true);
      expect(parsed.data.ML_INTERNAL_KEY).toBeUndefined();
    });
  });

  describe('Recommendation service graceful fallback when key is missing or mismatched', () => {
    const mockModel = engine.buildCareerModel({
      careerSlug: 'software-engineer',
      skills: [
        { slug: 'python', name: 'Python', category: 'programming', difficulty: 2 },
        { slug: 'statistics', name: 'Statistics', category: 'data-analytics', difficulty: 3 },
      ],
      edges: [],
      careerSkills: [
        { skillSlug: 'python', requiredLevel: 3, importance: 0.9 },
        { skillSlug: 'statistics', requiredLevel: 3, importance: 0.8 },
      ],
    });

    const mockProfile = { python: 1 };

    it('safely falls back to strategy "rule" when ML client has no internalKey configured', async () => {
      const disabledMlClient = createMlClient({
        baseUrl: 'http://localhost:8000',
        internalKey: '',
        fetchImpl: vi.fn(),
      });

      expect(disabledMlClient.isConfigured()).toBe(false);

      const res = await getNextSkills('user-123', 'software-engineer', {
        deps: {
          mlClient: disabledMlClient,
          model: mockModel,
          profile: mockProfile,
        },
      });

      expect(res.strategy).toBe('rule');
      expect(res.fallbackReason).toBe('ML_UNAVAILABLE');
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
    });

    it('safely falls back to strategy "rule" when ML service rejects request with 401 Unauthorized', async () => {
      const rejectingFetch = vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized: invalid or missing X-Internal-Key' }),
      }));

      const mismatchedMlClient = createMlClient({
        baseUrl: 'http://localhost:8000',
        internalKey: 'mismatched-key-123',
        fetchImpl: rejectingFetch,
      });

      const res = await getNextSkills('user-123', 'software-engineer', {
        deps: {
          mlClient: mismatchedMlClient,
          model: mockModel,
          profile: mockProfile,
        },
      });

      expect(res.strategy).toBe('rule');
      expect(res.fallbackReason).toBe('ML_UNAVAILABLE');
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
      expect(rejectingFetch).toHaveBeenCalledTimes(1);
    });
  });
});
