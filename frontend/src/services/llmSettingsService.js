import { api } from './api.js';

/**
 * Retrieves the student's current LLM settings and server fallback quota.
 *
 * @returns {Promise<{ provider: string, model: string, hasKey: boolean, keyLast4: string|null, serverKeyAvailable: boolean, serverKeyRemainingToday: number }>}
 */
export async function getLlmSettings() {
  return api.get('/settings/llm');
}

/**
 * Updates LLM settings (saves encrypted key and/or chosen model).
 *
 * @param {Object} data
 * @param {string} [data.apiKey]
 * @param {string} [data.model]
 * @returns {Promise<Object>}
 */
export async function updateLlmSettings(data) {
  return api.put('/settings/llm', data);
}

/**
 * Removes the stored user API key from database.
 *
 * @returns {Promise<Object>}
 */
export async function removeLlmKey() {
  return api.delete('/settings/llm/key');
}

/**
 * Tests the effective API key and model against OpenRouter.
 *
 * @returns {Promise<{ ok: boolean, model: string }>}
 */
export async function testLlmKey() {
  return api.post('/settings/llm/test');
}

/**
 * Retrieves suggested free/recommended OpenRouter model identifiers.
 *
 * @returns {Promise<{ items: Array<{ id: string, note: string }> }>}
 */
export async function getSuggestedModels() {
  return api.get('/settings/llm/suggested-models');
}

export default {
  getLlmSettings,
  updateLlmSettings,
  removeLlmKey,
  testLlmKey,
  getSuggestedModels,
};
