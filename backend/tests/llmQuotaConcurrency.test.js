import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { ChatMessage } from '../src/models/chatMessage.model.js';
import {
  orchestrateChat,
  reserveServerQuota,
  releaseQuotaReservation,
} from '../src/services/ai/orchestrator.js';
import crypto from 'node:crypto';
import { encryptSecret } from '../src/utils/crypto.js';

let mongoServer = null;

const SECRET = crypto.randomBytes(32).toString('base64');
const SERVER_KEY = 'sk-or-server-test-key-12345';
const USER_KEY = 'sk-or-user-custom-key-67890';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe('Concurrency-Safe Server LLM Quota Enforcement & Reservation Policy', () => {
  let serverUser = null;
  let byokUser = null;
  let testCareer = null;
  let pythonSkill = null;

  const baseEnv = {
    LLM_KEY_ENCRYPTION_SECRET: SECRET,
    OPENROUTER_API_KEY: SERVER_KEY,
    OPENROUTER_DEFAULT_MODEL: 'test-model-free',
    SERVER_KEY_DAILY_LIMIT: 5, // Low cap for test deterministic checks
    LLM_TIMEOUT_MS: 15000,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    await Promise.all([
      User.deleteMany({}),
      Skill.deleteMany({}),
      Career.deleteMany({}),
      CareerSkill.deleteMany({}),
      ChatMessage.deleteMany({}),
    ]);

    testCareer = await Career.create({
      slug: 'ai-engineer',
      name: 'AI Engineer',
      description: 'AI Engineering career',
      category: 'ai',
      icon: 'brain',
      isActive: true,
    });

    pythonSkill = await Skill.create({
      slug: 'python',
      name: 'Python',
      category: 'programming',
      difficulty: 2,
    });

    await CareerSkill.create({
      careerId: testCareer._id,
      skillId: pythonSkill._id,
      requiredLevel: 3,
      importance: 1.0,
    });

    // Student without BYOK key (relies on shared server fallback key)
    serverUser = await User.create({
      name: 'Server Key Student',
      email: 'server_student@example.com',
      passwordHash: 'hashed_pw',
      role: 'student',
      targetCareerId: testCareer._id,
      serverKeyUsage: {
        date: new Date().toISOString().slice(0, 10),
        count: 0,
      },
    });

    // Student with BYOK key (unlimited chat access)
    const encryptedByok = encryptSecret(USER_KEY, SECRET);
    byokUser = await User.create({
      name: 'BYOK Student',
      email: 'byok_student@example.com',
      passwordHash: 'hashed_pw',
      role: 'student',
      targetCareerId: testCareer._id,
      llmSettings: {
        provider: 'openrouter',
        apiKeyEnc: encryptedByok,
        apiKeyLast4: USER_KEY.slice(-4),
        model: 'anthropic/claude-3-haiku',
      },
      serverKeyUsage: {
        date: new Date().toISOString().slice(0, 10),
        count: 0,
      },
    });
  });

  describe('1. Atomic Pre-Allocation & Concurrency Enforcement', () => {
    it('atomically prevents concurrent requests from exceeding configured daily limit', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dailyLimit = 5;

      // Seed user with 3 used, 2 slots remaining
      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: todayStr, count: 3 } } },
      );

      let chatCalls = 0;
      const fakeClient = {
        chat: vi.fn(async () => {
          chatCalls += 1;
          // Small artificial delay to simulate realistic in-flight network execution
          await new Promise((r) => setTimeout(r, 10));
          return { content: 'Grounded AI reply from server key.' };
        }),
      };

      // Launch 8 concurrent requests simultaneously
      const concurrencyPromises = Array.from({ length: 8 }).map((_, idx) =>
        orchestrateChat({
          userId: serverUser._id.toString(),
          message: `Why should I learn Python? (request ${idx})`,
          overrideIntent: 'explain_recommendation',
          overrideParams: { skillSlug: 'python' },
          openrouterClient: fakeClient,
          env: { ...baseEnv, SERVER_KEY_DAILY_LIMIT: dailyLimit },
        }),
      );

      const results = await Promise.all(concurrencyPromises);

      // Verify database count NEVER exceeded the cap of 5
      const freshUser = await User.findById(serverUser._id);
      expect(freshUser.serverKeyUsage.count).toBe(5);

      // Exactly 2 requests succeeded with server key and received LLM response
      const serverReplies = results.filter((r) => r.keySource === 'server' && !r.degraded);
      expect(serverReplies).toHaveLength(2);

      // OpenRouter client was called exactly 2 times (never 8 times!)
      expect(chatCalls).toBe(2);

      // The remaining 6 requests were blocked by atomic reservation and degraded gracefully
      const degradedReplies = results.filter((r) => r.keySource === 'none' && r.degraded);
      expect(degradedReplies).toHaveLength(6);
      for (const res of degradedReplies) {
        expect(res.notice).toContain('Add your own OpenRouter key in Settings for unlimited chat');
      }
    });

    it('blocks external calls before invoking OpenRouter when user is already at quota', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: todayStr, count: 5 } } },
      );

      const chatSpy = vi.fn();
      const fakeClient = { chat: chatSpy };

      const res = await orchestrateChat({
        userId: serverUser._id.toString(),
        message: 'Why should I learn Python?',
        openrouterClient: fakeClient,
        env: { ...baseEnv, SERVER_KEY_DAILY_LIMIT: 5 },
      });

      // No external calls made
      expect(chatSpy).not.toHaveBeenCalled();
      expect(res.keySource).toBe('none');
      expect(res.degraded).toBe(true);
      expect(res.notice).toContain('Add your own OpenRouter key in Settings for unlimited chat');
    });
  });

  describe('2. Provider Failure & Timeout Refund Policy', () => {
    it('refunds reserved quota slot when OpenRouter call times out', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: todayStr, count: 2 } } },
      );

      // Simulate network timeout from OpenRouter
      const timeoutClient = {
        chat: vi.fn(async () => {
          const timeoutErr = new Error('Request timed out');
          timeoutErr.name = 'AbortError';
          throw timeoutErr;
        }),
      };

      const res = await orchestrateChat({
        userId: serverUser._id.toString(),
        message: 'Why should I learn Python?',
        overrideIntent: 'explain_recommendation',
        overrideParams: { skillSlug: 'python' },
        openrouterClient: timeoutClient,
        env: { ...baseEnv, SERVER_KEY_DAILY_LIMIT: 5 },
      });

      expect(res.degraded).toBe(true);

      // Quota slot must be refunded: count should remain 2 (not 3)
      const freshUser = await User.findById(serverUser._id);
      expect(freshUser.serverKeyUsage.count).toBe(2);
    });

    it('refunds reserved quota slot when OpenRouter call throws 500 error', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: todayStr, count: 1 } } },
      );

      const errorClient = {
        chat: vi.fn(async () => {
          throw new Error('OpenRouter returned 502 Bad Gateway');
        }),
      };

      const res = await orchestrateChat({
        userId: serverUser._id.toString(),
        message: 'Why should I learn Python?',
        overrideIntent: 'explain_recommendation',
        overrideParams: { skillSlug: 'python' },
        openrouterClient: errorClient,
        env: { ...baseEnv, SERVER_KEY_DAILY_LIMIT: 5 },
      });

      expect(res.degraded).toBe(true);

      // Quota slot must be refunded
      const freshUser = await User.findById(serverUser._id);
      expect(freshUser.serverKeyUsage.count).toBe(1);
    });

    it('retains reserved quota when OpenRouter call succeeds', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: todayStr, count: 1 } } },
      );

      const successClient = {
        chat: vi.fn(async () => ({
          content: 'Here is your successful AI explanation.',
        })),
      };

      const res = await orchestrateChat({
        userId: serverUser._id.toString(),
        message: 'Why should I learn Python?',
        overrideIntent: 'explain_recommendation',
        overrideParams: { skillSlug: 'python' },
        openrouterClient: successClient,
        env: { ...baseEnv, SERVER_KEY_DAILY_LIMIT: 5 },
      });

      expect(res.degraded).toBe(false);
      expect(res.keySource).toBe('server');

      // Quota is consumed: count goes from 1 -> 2
      const freshUser = await User.findById(serverUser._id);
      expect(freshUser.serverKeyUsage.count).toBe(2);
    });
  });

  describe('3. User-Supplied API Key (BYOK) Quota Policy', () => {
    it('bypasses server quota reservation entirely and permits unlimited chat', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Seed byokUser with serverKeyUsage count already at 5 (max server quota)
      await User.updateOne(
        { _id: byokUser._id },
        { $set: { serverKeyUsage: { date: todayStr, count: 5 } } },
      );

      let byokChatCalls = 0;
      const fakeClient = {
        chat: vi.fn(async ({ apiKey }) => {
          byokChatCalls += 1;
          expect(apiKey).toBe(USER_KEY); // Must use user's decrypted key
          return { content: 'BYOK response.' };
        }),
      };

      // Send 5 concurrent requests with byokUser
      const requests = Array.from({ length: 5 }).map((_, idx) =>
        orchestrateChat({
          userId: byokUser._id.toString(),
          message: `BYOK query ${idx}`,
          overrideIntent: 'explain_recommendation',
          overrideParams: { skillSlug: 'python' },
          openrouterClient: fakeClient,
          env: { ...baseEnv, SERVER_KEY_DAILY_LIMIT: 5 },
        }),
      );

      const results = await Promise.all(requests);

      // All 5 succeeded using user's key
      expect(byokChatCalls).toBe(5);
      for (const res of results) {
        expect(res.keySource).toBe('user');
        expect(res.degraded).toBe(false);
      }

      // serverKeyUsage was NEVER incremented (still 5)
      const freshUser = await User.findById(byokUser._id);
      expect(freshUser.serverKeyUsage.count).toBe(5);
    });
  });

  describe('4. Direct Reservation & Refund Helpers Unit Verification', () => {
    it('reserveServerQuota rolls over from previous day cleanly', async () => {
      const yesterday = '2026-10-09';
      const today = '2026-10-10';

      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: yesterday, count: 30 } } },
      );

      const res = await reserveServerQuota(serverUser._id, today, 5, User);
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);

      const updated = await User.findById(serverUser._id);
      expect(updated.serverKeyUsage.date).toBe(today);
      expect(updated.serverKeyUsage.count).toBe(1);
    });

    it('releaseQuotaReservation does not decrement below 0', async () => {
      const today = '2026-10-10';
      await User.updateOne(
        { _id: serverUser._id },
        { $set: { serverKeyUsage: { date: today, count: 0 } } },
      );

      await releaseQuotaReservation(serverUser._id, today, User);

      const updated = await User.findById(serverUser._id);
      expect(updated.serverKeyUsage.count).toBe(0);
    });
  });
});
