import { logger } from '../../utils/logger.js';

/**
 * Creates an HTTP client for the internal Python FastAPI ML service.
 *
 * @param {Object} options
 * @param {string} options.baseUrl - Base URL of ML service (e.g. http://localhost:8000)
 * @param {string} options.internalKey - Shared internal key (ML_INTERNAL_KEY)
 * @param {number} [options.timeoutMs=3000] - Request timeout in milliseconds
 * @param {Function} [options.fetchImpl=fetch] - Fetch implementation (injectable for testing)
 * @returns {{
 *   health: () => Promise<Object|null>,
 *   modelInfo: () => Promise<Object|null>,
 *   recommend: (params: { careerSlug: string, proficiencies: Object, semester?: number, topK?: number }) => Promise<Object|null>
 * }}
 */
export function createMlClient({
  baseUrl = 'http://localhost:8000',
  internalKey = '',
  timeoutMs = 3000,
  fetchImpl = fetch,
} = {}) {
  const normalizedBase = String(baseUrl).replace(/\/+$/, '');

  /**
   * Safe fetch helper that handles timeouts, errors, and JSON parsing.
   * Never throws. Logs a sanitized warning on failure.
   *
   * @param {string} endpoint
   * @param {Object} options
   * @returns {Promise<Object|null>}
   */
  async function safeFetch(endpoint, options = {}) {
    const url = `${normalizedBase}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        logger.warn(`ML service ${endpoint} returned status ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const isTimeout = err?.name === 'AbortError';
      logger.warn(`ML service ${endpoint} call failed: ${isTimeout ? 'Request timed out' : err?.message || 'Network error'}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /**
     * Check ML service health.
     * GET /health (unauthenticated)
     *
     * @returns {Promise<Object|null>}
     */
    async health() {
      return safeFetch('/health', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    },

    /**
     * Fetch ML model metadata and metrics.
     * GET /model/info (requires X-Internal-Key)
     *
     * @returns {Promise<Object|null>}
     */
    async modelInfo() {
      return safeFetch('/model/info', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Internal-Key': internalKey,
        },
      });
    },

    /**
     * Request ML recommendations for next skills.
     * POST /recommend (requires X-Internal-Key)
     *
     * @param {Object} params
     * @param {string} params.careerSlug
     * @param {Object} params.proficiencies
     * @param {number} [params.semester]
     * @param {number} [params.topK]
     * @returns {Promise<Object|null>}
     */
    async recommend({ careerSlug, proficiencies = {}, semester, topK } = {}) {
      const payload = {
        careerSlug,
        proficiencies,
        ...(semester !== undefined ? { semester } : {}),
        ...(topK !== undefined ? { topK } : {}),
      };

      return safeFetch('/recommend', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Internal-Key': internalKey,
        },
        body: JSON.stringify(payload),
      });
    },
  };
}

export default createMlClient;
