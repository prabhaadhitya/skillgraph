import { User } from '../models/user.model.js';
import { env as defaultEnv } from '../config/env.js';
import { createOpenRouterClient } from './llm/openrouterClient.js';
import { encryptSecret, decryptSecret, getLast4 } from '../utils/crypto.js';
import { resolveKey } from './llm/keyResolver.js';
import { ApiError } from '../utils/ApiError.js';
import { LlmError } from './llm/LlmError.js';

/**
 * Factory for creating the Settings Service.
 * Allows dependency injection for models, env, openrouterClient, and time provider in tests.
 *
 * @param {Object} [options={}]
 * @param {Object} [options.models]
 * @param {Object} [options.env]
 * @param {Object} [options.openrouterClient]
 * @param {Function} [options.now]
 * @returns {Object} Settings service instance
 */
export function createSettingsService({
  models = { User },
  env = defaultEnv,
  openrouterClient,
  now = () => new Date(),
} = {}) {
  const client =
    openrouterClient ||
    createOpenRouterClient({
      baseUrl: env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    });

  /**
   * Helper to get current date string in YYYY-MM-DD.
   *
   * @returns {string}
   */
  function getTodayString() {
    if (typeof now === 'function') {
      const val = now();
      if (val instanceof Date) {
        return val.toISOString().slice(0, 10);
      }
      return String(val).slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Fetch current LLM settings and server key quota status for a user.
   *
   * @param {string} userId
   * @returns {Promise<{
   *   provider: string,
   *   model: string,
   *   hasKey: boolean,
   *   keyLast4: string|null,
   *   serverKeyAvailable: boolean,
   *   serverKeyRemainingToday: number
   * }>}
   */
  async function getSettings(userId) {
    const user = await models.User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    const hasKey = Boolean(user.llmSettings?.apiKeyLast4 && user.llmSettings.apiKeyLast4.length > 0);
    const keyLast4 = hasKey ? user.llmSettings.apiKeyLast4 : null;
    const model = user.llmSettings?.model || env.OPENROUTER_DEFAULT_MODEL || '';

    const serverKey = env.OPENROUTER_API_KEY;
    const serverKeyAvailable = Boolean(serverKey && typeof serverKey === 'string' && serverKey.trim().length > 0);

    const todayStr = getTodayString();
    const dailyLimit = Number(env.SERVER_KEY_DAILY_LIMIT) || 30;
    const isToday = user.serverKeyUsage?.date === todayStr;
    const count = isToday && typeof user.serverKeyUsage?.count === 'number' ? user.serverKeyUsage.count : 0;
    const serverKeyRemainingToday = Math.max(0, dailyLimit - count);

    return {
      provider: 'openrouter',
      model,
      hasKey,
      keyLast4,
      serverKeyAvailable,
      serverKeyRemainingToday,
    };
  }

  /**
   * Update user LLM settings (save encrypted API key and/or model).
   *
   * @param {string} userId
   * @param {Object} payload
   * @param {string} [payload.apiKey]
   * @param {string} [payload.model]
   * @returns {Promise<Object>} Updated settings
   */
  async function updateSettings(userId, { apiKey, model } = {}) {
    const update = {};

    if (apiKey) {
      const secret = env.LLM_KEY_ENCRYPTION_SECRET;
      if (!secret) {
        throw new ApiError(500, 'CONFIGURATION_ERROR', 'Encryption secret is not configured');
      }

      const encrypted = encryptSecret(apiKey, secret);
      const keyLast4 = getLast4(apiKey);

      update['llmSettings.apiKeyEnc'] = encrypted;
      update['llmSettings.apiKeyLast4'] = keyLast4;
    }

    if (model !== undefined) {
      update['llmSettings.model'] = model;
    }

    const updatedUser = await models.User.findByIdAndUpdate(
      userId,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedUser) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    return getSettings(userId);
  }

  /**
   * Remove stored user API key while keeping saved model preference.
   *
   * @param {string} userId
   * @returns {Promise<Object>} Updated settings
   */
  async function removeKey(userId) {
    const updatedUser = await models.User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          'llmSettings.apiKeyEnc': 1,
          'llmSettings.apiKeyLast4': 1,
        },
      },
      { returnDocument: 'after' },
    );

    if (!updatedUser) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    return getSettings(userId);
  }

  /**
   * Test the effective API key and model with OpenRouter.
   * Does not consume user's server key quota.
   *
   * @param {string} userId
   * @returns {Promise<{ ok: boolean, model: string }>}
   */
  async function testKey(userId) {
    const user = await models.User.findById(userId).select('+llmSettings.apiKeyEnc');
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    const hasUserKey = Boolean(user.llmSettings?.apiKeyEnc?.ciphertext);

    const decryptUserKey = () => {
      const secret = env.LLM_KEY_ENCRYPTION_SECRET;
      if (!secret) {
        throw new ApiError(500, 'CONFIGURATION_ERROR', 'Encryption secret is not configured');
      }
      return decryptSecret(user.llmSettings.apiKeyEnc, secret);
    };

    const todayStr = getTodayString();
    const resolution = resolveKey({
      userKeyPresent: hasUserKey,
      decryptUserKey,
      serverKey: env.OPENROUTER_API_KEY || null,
      usage: user.serverKeyUsage || null,
      dailyLimit: Number(env.SERVER_KEY_DAILY_LIMIT) || 30,
      today: todayStr,
    });

    if (resolution.source === 'none') {
      throw new ApiError(422, 'RULE_VIOLATION', 'No key available. Add your own key first.');
    }

    const effectiveModel = user.llmSettings?.model || env.OPENROUTER_DEFAULT_MODEL || '';

    try {
      await client.chat({
        apiKey: resolution.apiKey,
        model: effectiveModel || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: 'Reply with OK' }],
        maxTokens: 5,
      });

      return {
        ok: true,
        model: effectiveModel,
      };
    } catch (err) {
      let friendlyMessage = 'OpenRouter returned an error.';

      if (
        (err instanceof LlmError && err.kind === 'auth') ||
        err?.kind === 'auth' ||
        err?.status === 401 ||
        err?.statusCode === 401
      ) {
        friendlyMessage = 'The key was rejected by OpenRouter.';
      } else if (
        (err instanceof LlmError && err.kind === 'rate_limit') ||
        err?.kind === 'rate_limit' ||
        err?.status === 429
      ) {
        friendlyMessage = 'OpenRouter is rate limiting this key. Try again in a minute.';
      } else if (
        (err instanceof LlmError && err.kind === 'timeout') ||
        err?.kind === 'timeout' ||
        err?.name === 'AbortError'
      ) {
        friendlyMessage = 'OpenRouter did not answer in time.';
      }

      throw new ApiError(502, 'UPSTREAM_ERROR', friendlyMessage);
    }
  }

  /**
   * Return short curated list of suggested models from config.
   *
   * @returns {{ items: Array<{ id: string, note: string }> }}
   */
  function suggestedModels() {
    const raw = env.SUGGESTED_MODELS || process.env.SUGGESTED_MODELS;
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return { items: [] };
    }

    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ id, note: '' }));

    return { items };
  }

  return {
    getSettings,
    updateSettings,
    removeKey,
    testKey,
    suggestedModels,
  };
}

export const defaultSettingsService = createSettingsService();
export let activeSettingsService = defaultSettingsService;

/**
 * Set the active settings service instance (used for dependency injection in tests).
 *
 * @param {Object} service
 */
export function setSettingsService(service) {
  activeSettingsService = service;
}

export default createSettingsService;
