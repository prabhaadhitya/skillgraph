import { z } from 'zod';
import { ChatMessage } from '../../models/chatMessage.model.js';
import { User } from '../../models/user.model.js';
import { env as defaultEnv } from '../../config/env.js';
import { createOpenRouterClient } from './openrouterClient.js';
import { keywordRouter } from './keywordRouter.js';
import { renderTemplateAnswer } from './templates.js';
import { ALLOWED_INTENTS, validateIntent, parseIntentJson } from '../llm/intents.js';
import { buildIntentMessages, buildComposeMessages } from './prompts.js';
import { resolveKey, nextUsage } from '../llm/keyResolver.js';
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
  const keyResolution = resolveKey({
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

  // 2. Intent Classification Step
  if (!intent) {
    if (keyResolution.source === 'none') {
      // Degradation Ladder Step 3: No key available -> heuristic keyword router
      const kwResult = keywordRouter(message, catalog);
      intent = kwResult.intent;
      params = kwResult.params;
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
      } catch {
        // Degradation Ladder Step 1: Fall back to keyword router
        const kwResult = keywordRouter(message, catalog);
        intent = kwResult.intent;
        params = kwResult.params;
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
  if (keyResolution.source === 'none') {
    // Degradation Ladder Step 3: Server key limit reached or no key configured
    reply = renderTemplateAnswer(intent, facts);
    degraded = true;
    notice =
      keyResolution.reason === 'DAILY_LIMIT'
        ? 'Add your own OpenRouter key in Settings for unlimited chat'
        : 'Add your own OpenRouter key in Settings';
  } else if (retrieverResult?.needsClarification) {
    reply = renderTemplateAnswer('out_of_scope', facts);
    degraded = true;
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

      // If server fallback key succeeded, track daily quota usage
      if (keyResolution.source === 'server' && user) {
        try {
          const updatedUsage = nextUsage(user.serverKeyUsage, todayStr);
          await UserModel.findByIdAndUpdate(userId, { serverKeyUsage: updatedUsage });
        } catch {
          // Non-critical background quota update failure
        }
      }
    } catch {
      // Degradation Ladder Step 2: Failed or timed-out compose LLM call -> deterministic template answer
      reply = renderTemplateAnswer(intent, facts);
      degraded = true;
    }
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
};
