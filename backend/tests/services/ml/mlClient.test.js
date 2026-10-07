import { describe, it, expect, vi } from 'vitest';
import { createMlClient } from '../../../src/services/ml/mlClient.js';

describe('services/ml/mlClient', () => {
  const baseUrl = 'http://localhost:8000';
  const internalKey = 'test-secret-internal-key';

  describe('health()', () => {
    it('calls GET /health without X-Internal-Key and returns data', async () => {
      let requestedUrl = '';
      let requestedOptions = {};

      const fakeFetch = vi.fn(async (url, options) => {
        requestedUrl = url;
        requestedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', modelLoaded: true }),
        };
      });

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch });
      const result = await client.health();

      expect(requestedUrl).toBe('http://localhost:8000/health');
      expect(requestedOptions.method).toBe('GET');
      expect(requestedOptions.headers['X-Internal-Key']).toBeUndefined();
      expect(result).toEqual({ status: 'ok', modelLoaded: true });
    });
  });

  describe('modelInfo()', () => {
    it('calls GET /model/info with X-Internal-Key header', async () => {
      let requestedUrl = '';
      let requestedOptions = {};

      const fakeFetch = vi.fn(async (url, options) => {
        requestedUrl = url;
        requestedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            modelVersion: 'v1',
            algorithm: 'RandomForestClassifier',
            trainingData: 'synthetic',
          }),
        };
      });

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch });
      const result = await client.modelInfo();

      expect(requestedUrl).toBe('http://localhost:8000/model/info');
      expect(requestedOptions.method).toBe('GET');
      expect(requestedOptions.headers['X-Internal-Key']).toBe(internalKey);
      expect(result?.modelVersion).toBe('v1');
    });
  });

  describe('recommend()', () => {
    it('calls POST /recommend with X-Internal-Key and JSON body', async () => {
      let requestedUrl = '';
      let requestedOptions = {};

      const fakeFetch = vi.fn(async (url, options) => {
        requestedUrl = url;
        requestedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            modelVersion: 'v1',
            items: [{ skillSlug: 'python', score: 0.92 }],
          }),
        };
      });

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch });
      const result = await client.recommend({
        careerSlug: 'ml-engineer',
        proficiencies: { python: 2 },
        semester: 5,
        topK: 3,
      });

      expect(requestedUrl).toBe('http://localhost:8000/recommend');
      expect(requestedOptions.method).toBe('POST');
      expect(requestedOptions.headers['X-Internal-Key']).toBe(internalKey);
      expect(requestedOptions.headers['Content-Type']).toBe('application/json');

      const parsedBody = JSON.parse(requestedOptions.body);
      expect(parsedBody).toEqual({
        careerSlug: 'ml-engineer',
        proficiencies: { python: 2 },
        semester: 5,
        topK: 3,
      });

      expect(result).toEqual({
        modelVersion: 'v1',
        items: [{ skillSlug: 'python', score: 0.92 }],
      });
    });
  });

  describe('error handling (never throws, returns null)', () => {
    it('returns null on 500 response', async () => {
      const fakeFetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      }));

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch });
      const result = await client.modelInfo();

      expect(result).toBeNull();
    });

    it('returns null on bad/malformed JSON', async () => {
      const fakeFetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      }));

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch });
      const result = await client.health();

      expect(result).toBeNull();
    });

    it('returns null on network failure', async () => {
      const fakeFetch = vi.fn(async () => {
        throw new Error('Connection refused: ECONNREFUSED');
      });

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch });
      const result = await client.recommend({ careerSlug: 'test' });

      expect(result).toBeNull();
    });

    it('returns null on timeout (AbortError)', async () => {
      const fakeFetch = vi.fn(async () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      });

      const client = createMlClient({ baseUrl, internalKey, fetchImpl: fakeFetch, timeoutMs: 50 });
      const result = await client.health();

      expect(result).toBeNull();
    });
  });
});
