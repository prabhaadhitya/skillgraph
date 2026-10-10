import { z } from 'zod';
import { ChatMessage } from '../../models/chatMessage.model.js';
import { User } from '../../models/user.model.js';
import { env as defaultEnv } from '../../config/env.js';
import { createOpenRouterClient } from './openrouterClient.js';
import { keywordRouter } from './keywordRouter.js';
import { renderTemplateAnswer } from './templates.js';
import { ALLOWED_INTENTS, validateIntent, parseIntentJson } from '../llm/intents.js';
import { buildIntentMessages, buildComposeMessages } from './prompts.js';
import { resolveKey } from '../llm/keyResolver.js';
import { decryptSecret } from '../../utils/crypto.js';
import { executeRetriever, getDefaultDeps } from './retrievers/index.js';

/**
 * Normalizes user or model skill references to catalog slugs.
 */
function normalizeSkillSlug(raw, catalogSkills = []) {
  if (!raw || typeof raw !== 'string') return undefined;
  const val = raw.trim();
  const lower = val.toLowerCase();
  const slugified = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  for (const s of catalogSkills) {
    if (s.slug === val || s.slug === lower || s.slug === slugified) return s.slug;
    if (s.name && (s.name.toLowerCase() === lower || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slugified)) {
      return s.slug;
    }
  }
  return val;
}

/**
 * Normalizes user or model career references to catalog slugs.
 */
function normalizeCareerSlug(raw, catalogCareers = []) {
  if (!raw || typeof raw !== 'string') return undefined;
  const val = raw.trim();
  const lower = val.toLowerCase();
  const slugified = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  for (const c of catalogCareers) {
    if (c.slug === val || c.slug === lower || c.slug === slugified) return c.slug;
    if (c.name && (c.name.toLowerCase() === lower || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slugified)) {
      return c.slug;
    }
  }
  return val;
}

const rawIntentSchema = z
  .object({
    intent: z.enum(ALLOWED_INTENTS),
    skillSlug: z.string().optional(),
    careerSlug: z.string().optional(),
    otherSkillSlug: z.string().optional(),
    weeks: z.union([z.number(), z.string()]).optional(),
    params: z
      .object({
        skillSlug: z.string().optional(),
        careerSlug: z.string().optional(),
        otherSkillSlug: z.string().optional(),
        weeks: z.union([z.number(), z.string()]).optional(),
      })
      .optional(),
  })
  .passthrough();

/**
 * Loads skills and active careers to build catalog allow-lists.
 *
 * @param {Object} [deps={}]
 * @returns {Promise<{ skills: Array<{ slug: string, name: string }>, careers: Array<{ slug: string, name: string }> }>}
 */
async function loadCatalog(deps = {}) {
  if (deps.catalog) {
    return deps.catalog;
  }
  try {
    const { Skill } = await import('../../models/skill.model.js');
    const { Career } = await import('../../models/career.model.js');
    const [skills, careers] = await Promise.all([
      Skill.find({}).select('slug name category').lean(),
      Career.find({ isActive: true }).select('slug name').lean(),
    ]);
    return {
      skills: (skills || []).map((s) => ({ slug: s.slug, name: s.name, category: s.category })),
      careers: (careers || []).map((c) => ({ slug: c.slug, name: c.name })),
    };
  } catch {
    return { skills: [], careers: [] };
  }
}

/**
 * Loads recent conversation history for a user.
 *
 * @param {string} userId
 * @param {Object} [models={}]
 * @returns {Promise<Array<{ role: string, content: string }>>}
 */
async function loadHistory(userId, models = {}) {
  const ChatModel = models.ChatMessage || ChatMessage;
  try {
    const docs = await ChatModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    return docs.reverse().map((d) => ({ role: d.role, content: d.content }));
  } catch {
    return [];
  }
}

/**
 * Concurrency-Safe Server LLM Quota Reservation Policy:
 * 1. Pre-Allocation Reservation: Atomically reserves 1 quota slot (serverKeyUsage.count)
 *    prior to dispatching external calls to OpenRouter.
 * 2. Concurrency Limit Enforcement: Uses conditional atomic findOneAndUpdate with
 *    { 'serverKeyUsage.count': { $lt: dailyLimit } } to guarantee concurrent requests
 *    cannot exceed SERVER_KEY_DAILY_LIMIT.
 * 3. Provider Failure / Timeout Refund Policy: If a quota slot was reserved but the
 *    OpenRouter call times out, encounters a network drop, or fails with 5xx/429 (causing
 *    the request to degrade to a template answer), the reserved slot is atomically
 *    refunded ($inc: -1, min 0) so the student is not penalized.
 * 4. BYOK Exemption: User-supplied API keys (source: 'user') bypass server quota
 *    reservation completely and are not subject to serverKeyUsage limits.
 * 5. Off-Topic Exemption: Obvious off-topic queries resolved locally by the keyword router
 *    do not invoke OpenRouter and do not reserve or consume quota.
 */

/**
 * Concurrency-safe atomic server key quota reservation.
 * Atomically increments today's usage if count < dailyLimit, or rolls over from prior date.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} todayStr - 'YYYY-MM-DD'
 * @param {number} dailyLimit
 * @param {Object} [UserModel]
 * @returns {Promise<{ success: boolean, count?: number, reason?: string }>}
 */
export async function reserveServerQuota(userId, todayStr, dailyLimit, UserModel = User) {
  if (!UserModel) {
    return { success: true };
  }

  if (dailyLimit <= 0) {
    return { success: false, reason: 'DAILY_LIMIT' };
  }

  if (typeof UserModel.findOneAndUpdate === 'function') {
    // 1. Increment if date matches today and count is under limit
    const incRes = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        'serverKeyUsage.date': todayStr,
        'serverKeyUsage.count': { $lt: dailyLimit },
      },
      {
        $inc: { 'serverKeyUsage.count': 1 },
      },
      { returnDocument: 'after' },
    );

    if (incRes) {
      return { success: true, count: incRes?.serverKeyUsage?.count };
    }

    // 2. Rollover if date is not today, null, or record does not exist
    const resetRes = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { 'serverKeyUsage.date': { $ne: todayStr } },
          { 'serverKeyUsage.date': null },
          { serverKeyUsage: { $exists: false } },
        ],
      },
      {
        $set: {
          serverKeyUsage: { date: todayStr, count: 1 },
        },
      },
      { returnDocument: 'after' },
    );

    if (resetRes) {
      return { success: true, count: 1 };
    }

    // 3. Retry increment in case a concurrent request executed rollover simultaneously
    const retryInc = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        'serverKeyUsage.date': todayStr,
        'serverKeyUsage.count': { $lt: dailyLimit },
      },
      {
        $inc: { 'serverKeyUsage.count': 1 },
      },
      { returnDocument: 'after' },
    );

    if (retryInc) {
      return { success: true, count: retryInc?.serverKeyUsage?.count };
    }

    // Daily limit reached
    return { success: false, reason: 'DAILY_LIMIT' };
  }

  // Fallback for mock models without findOneAndUpdate
  return { success: true };
}

/**
 * Concurrency-safe atomic server key quota refund.
 * Releases 1 reserved quota slot when an external OpenRouter call fails, times out,
 * or degrades to a template answer, ensuring students are not penalized for provider downtime.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} todayStr - 'YYYY-MM-DD'
 * @param {Object} [UserModel]
 * @returns {Promise<void>}
 */
export async function releaseQuotaReservation(userId, todayStr, UserModel = User) {
  if (!UserModel || typeof UserModel.findOneAndUpdate !== 'function') {
    return;
  }
  try {
    await UserModel.findOneAndUpdate(
      {
        _id: userId,
        'serverKeyUsage.date': todayStr,
        'serverKeyUsage.count': { $gt: 0 },
      },
      {
        $inc: { 'serverKeyUsage.count': -1 },
      },
    );
  } catch {
    // Non-critical background refund error
  }
}

/**
 * Orchestrates a grounded chat interaction with degradation ladder.
 *
 * Ladder:
 * 1. Intent LLM failure / invalid JSON -> keywordRouter
 * 2. Compose LLM failure / timeout -> renderTemplateAnswer with degraded: true
 * 3. Daily limit reached or no key -> template answer + notice "Add your own OpenRouter key in Settings"
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated student user ID
 * @param {string} params.message - Student query (max 500 characters)
 * @param {Array<Object>} [params.history] - Optional conversation history
 * @param {string} [params.overrideIntent] - Skip intent step (used by /explain)
 * @param {Object} [params.overrideParams] - Predefined params for intent
 * @param {Object} [params.deps] - Injected service dependencies
 * @param {Object} [params.openrouterClient] - Injected OpenRouter client for testing
 * @param {Object} [params.models] - Injected models for testing
 * @param {Object} [params.env] - Injected env config for testing
 * @returns {Promise<{
 *   reply: string,
 *   intent: string,
 *   grounding: { skills: string[], careers: string[] },
 *   meta: { keySource: string, model: string, degraded: boolean },
 *   degraded: boolean,
 *   keySource: string,
 *   model: string,
 *   notice: string|null
 * }>}
 */
export async function orchestrateChat({
  userId,
  message,
  history: customHistory,
  overrideIntent,
  overrideParams,
  deps = {},
  openrouterClient,
  models = {},
  env = defaultEnv,
} = {}) {
  const UserModel = models.User || User;
  const ChatModel = models.ChatMessage || ChatMessage;
  const fullDeps = deps ? { ...getDefaultDeps(), ...deps } : getDefaultDeps();

  // 1. Resolve User and Settings
  const user = await UserModel.findById(userId).select('+llmSettings.apiKeyEnc');
  const userKeyPresent = Boolean(user?.llmSettings?.apiKeyEnc?.ciphertext);

  const decryptUserKey = () => {
    const secret = env.LLM_KEY_ENCRYPTION_SECRET;
    if (!secret || !user?.llmSettings?.apiKeyEnc) {
      return null;
    }
    return decryptSecret(user.llmSettings.apiKeyEnc, secret);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  let keyResolution = resolveKey({
    userKeyPresent,
    decryptUserKey,
    serverKey: env.OPENROUTER_API_KEY || null,
    usage: user?.serverKeyUsage || null,
    dailyLimit: Number(env.SERVER_KEY_DAILY_LIMIT) || 30,
    today: todayStr,
  });

  const configuredModel =
    user?.llmSettings?.model || env.OPENROUTER_DEFAULT_MODEL;
  const effectiveModel =
    configuredModel && configuredModel !== 'google/gemini-2.0-flash-exp:free'
      ? configuredModel
      : 'openrouter/free';

  const timeoutMs = Number(env.LLM_TIMEOUT_MS) || 15000;
  const client =
    openrouterClient ||
    createOpenRouterClient({
      baseUrl: env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    });

  // Load conversation history and catalog
  const history = Array.isArray(customHistory) ? customHistory : await loadHistory(userId, models);
  const catalog = await loadCatalog(fullDeps);
  const skillSlugs = new Set((catalog.skills || []).map((s) => s.slug));
  const careerSlugs = new Set((catalog.careers || []).map((c) => c.slug));

  let intent = overrideIntent || null;
  let params = overrideParams || {};
  let keyAuthFailed = false;
  let modelNotFound = false;
  let isLocalRoute = false;
  let hasLlmError = false;

  let serverQuotaReserved = false;

  const ensureServerQuotaReserved = async () => {
    if (keyResolution.source !== 'server') {
      return true;
    }
    if (serverQuotaReserved) {
      return true;
    }
    const dailyLimit = Number(env.SERVER_KEY_DAILY_LIMIT) || 30;
    const reservation = await reserveServerQuota(userId, todayStr, dailyLimit, UserModel);
    if (!reservation.success) {
      keyResolution = {
        apiKey: null,
        source: 'none',
        reason: 'DAILY_LIMIT',
      };
      return false;
    }
    serverQuotaReserved = true;
    return true;
  };

  // 2. Intent Classification Step
  if (!intent) {
    const localKw = keywordRouter(message, catalog);
    const isObviousOffTopic =
      /\b(poem|poetry|story|joke|recipe|weather|song|riddle|horoscope|lyrics|bake|cook)\b/i.test(message) &&
      localKw.intent === 'out_of_scope';

    if (isObviousOffTopic) {
      // Step 5: Obvious off-topic questions decided locally without an LLM call
      intent = 'out_of_scope';
      params = {};
      isLocalRoute = true;
    } else if (keyResolution.source === 'none') {
      // Degradation Ladder Step 3: No key available -> heuristic keyword router
      intent = localKw.intent;
      params = localKw.params;
      isLocalRoute = true;
    } else {
      const quotaOk = await ensureServerQuotaReserved();
      if (!quotaOk) {
        // Quota limit reached atomically: route directly via keywordRouter without OpenRouter call
        intent = localKw.intent;
        params = localKw.params;
        isLocalRoute = true;
      } else {
        try {
          const intentMessages = buildIntentMessages({ message, history, catalog });
          const intentResponse = await client.chat({
            apiKey: keyResolution.apiKey,
            model: effectiveModel,
            messages: intentMessages,
            temperature: 0.1,
            maxTokens: 250,
            timeoutMs,
          });

          const rawJson = parseIntentJson(intentResponse?.content);
          if (!rawJson) {
            throw new Error('Invalid JSON from intent LLM');
          }

          const parsedSchema = rawIntentSchema.safeParse(rawJson);
          if (!parsedSchema.success) {
            throw new Error('Zod validation failed on intent JSON');
          }

          const data = parsedSchema.data;
          const rawParams = {
            ...(data.params || {}),
            skillSlug: normalizeSkillSlug(data.skillSlug || data.params?.skillSlug, catalog.skills),
            careerSlug: normalizeCareerSlug(data.careerSlug || data.params?.careerSlug, catalog.careers),
            otherSkillSlug: normalizeSkillSlug(data.otherSkillSlug || data.params?.otherSkillSlug, catalog.skills),
            weeks: data.weeks !== undefined ? data.weeks : data.params?.weeks,
          };

          const validated = validateIntent(
            { intent: data.intent, params: rawParams },
            { skillSlugs, careerSlugs },
          );
          intent = validated.intent;
          params = validated.params;

          // If LLM returned out_of_scope but query matches a high-confidence intent keyword pattern, recover
          if (intent === 'out_of_scope') {
            const kwFallback = keywordRouter(message, catalog);
            if (kwFallback.intent !== 'out_of_scope') {
              intent = kwFallback.intent;
              params = kwFallback.params;
            }
          }
        } catch (err) {
          hasLlmError = true;
          if (
            err?.kind === 'auth' ||
            err?.message?.includes('401') ||
            err?.message?.includes('authentication failed')
          ) {
            keyAuthFailed = true;
          }
          if (
            err?.kind === 'bad_model' ||
            err?.message?.includes('not found') ||
            err?.message?.includes('404')
          ) {
            modelNotFound = true;
          }
          // Degradation Ladder Step 1: Fall back to keyword router
          const kwResult = keywordRouter(message, catalog);
          intent = kwResult.intent;
          params = kwResult.params;
          isLocalRoute = true;
        }
      }
    }
  }

  // 3. Facts Retrieval Step
  const retrieverResult = await executeRetriever(intent, fullDeps, userId, params);
  const facts = retrieverResult?.needsClarification ? {} : retrieverResult?.facts || {};
  const grounding = retrieverResult?.needsClarification
    ? { skills: [], careers: [] }
    : retrieverResult?.grounding || { skills: [], careers: [] };

  let reply = '';
  let degraded = false;
  let notice = null;

  // 4. Compose Step
  if (isLocalRoute && intent === 'out_of_scope') {
    // Step 5: If the router decided out_of_scope locally, polite redirect costs no second LLM call
    reply = renderTemplateAnswer('out_of_scope', facts);
    degraded = hasLlmError || keyResolution.source === 'none';
  } else if (keyResolution.source === 'none') {
    // Degradation Ladder Step 3: Server key limit reached or no key configured
    reply = renderTemplateAnswer(intent, facts);
    degraded = true;
    notice =
      keyResolution.reason === 'DAILY_LIMIT'
        ? 'Add your own OpenRouter key in Settings for unlimited chat'
        : 'Add your own OpenRouter key in Settings';
  } else if (keyAuthFailed) {
    reply = renderTemplateAnswer(intent, facts);
    degraded = true;
    notice = 'Your OpenRouter key was rejected. Check your key in Settings';
  } else if (modelNotFound) {
    reply = renderTemplateAnswer(intent, facts);
    degraded = true;
    notice = `The model '${effectiveModel}' was not found on OpenRouter. Check your model in Settings`;
  } else if (retrieverResult?.needsClarification) {
    reply = renderTemplateAnswer('out_of_scope', facts);
    degraded = true;
  } else {
    const quotaOk = await ensureServerQuotaReserved();
    if (!quotaOk) {
      reply = renderTemplateAnswer(intent, facts);
      degraded = true;
      notice = 'Add your own OpenRouter key in Settings for unlimited chat';
    } else {
      try {
        const composeMessages = buildComposeMessages({ intent, facts, message, history });
        const composeResponse = await client.chat({
          apiKey: keyResolution.apiKey,
          model: effectiveModel,
          messages: composeMessages,
          temperature: 0.3,
          maxTokens: 250,
          timeoutMs,
        });

        if (composeResponse?.content && typeof composeResponse.content === 'string') {
          reply = composeResponse.content.trim();
          degraded = false;
        } else {
          throw new Error('Empty response from compose LLM');
        }
      } catch (err) {
        // Degradation Ladder Step 2: Failed or timed-out compose LLM call -> deterministic template answer
        reply = renderTemplateAnswer(intent, facts);
        degraded = true;
        if (
          err?.kind === 'auth' ||
          err?.message?.includes('401') ||
          err?.message?.includes('authentication failed')
        ) {
          notice = 'Your OpenRouter key was rejected. Check your key in Settings';
        } else if (
          err?.kind === 'bad_model' ||
          err?.message?.includes('not found') ||
          err?.message?.includes('404')
        ) {
          notice = `The model '${effectiveModel}' was not found on OpenRouter. Check your model in Settings`;
        }
      }
    }
  }

  // Quota reservation refund policy:
  // If server quota was reserved but request degraded to template answer (provider error, timeout, etc.),
  // atomically refund the reserved slot so the user is not penalized for infrastructure downtime.
  if (serverQuotaReserved && degraded) {
    await releaseQuotaReservation(userId, todayStr, UserModel);
    serverQuotaReserved = false;
  }

  // 5. Persist Chat Messages
  try {
    await Promise.all([
      ChatModel.create({
        userId,
        role: 'user',
        content: message,
      }),
      ChatModel.create({
        userId,
        role: 'assistant',
        content: reply,
        intent,
        meta: {
          model: effectiveModel,
          keySource: keyResolution.source,
          degraded,
        },
      }),
    ]);
  } catch {
    // Persist failure should not break user response in fallback/testing modes
  }

  return {
    reply,
    intent,
    grounding: {
      skills: grounding.skills || [],
      careers: grounding.careers || [],
    },
    facts,
    meta: {
      keySource: keyResolution.source,
      model: effectiveModel,
      degraded,
    },
    degraded,
    keySource: keyResolution.source,
    model: effectiveModel,
    notice,
  };
}

/**
 * Specialised handler for explaining a single recommended skill.
 * Used by POST /ai/explain.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.skillSlug
 * @param {Object} [params.deps]
 * @param {Object} [params.openrouterClient]
 * @returns {Promise<Object>}
 */
export async function orchestrateExplain({
  userId,
  skillSlug,
  deps = {},
  openrouterClient,
  models = {},
  env = defaultEnv,
} = {}) {
  const userMessage = `Why should I learn ${skillSlug}?`;
  return orchestrateChat({
    userId,
    message: userMessage,
    overrideIntent: 'explain_recommendation',
    overrideParams: { skillSlug },
    deps,
    openrouterClient,
    models,
    env,
  });
}

export default {
  orchestrateChat,
  orchestrateExplain,
  reserveServerQuota,
  releaseQuotaReservation,
};
