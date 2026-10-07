import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'node:crypto';
import { app } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { env } from '../../../src/config/env.js';
import { logger } from '../../../src/utils/logger.js';
import { signToken } from '../../../src/services/auth.service.js';
import {
  createSettingsService,
  setSettingsService,
  defaultSettingsService,
} from '../../../src/services/settings.service.js';
import { LlmError } from '../../../src/services/llm/LlmError.js';

let mongoServer = null;

const testSecret = crypto.randomBytes(32).toString('base64');
process.env.LLM_KEY_ENCRYPTION_SECRET = testSecret;
env.LLM_KEY_ENCRYPTION_SECRET = testSecret;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());
  await User.deleteMany({});
});

afterAll(async () => {
  try {
    await User.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    setSettingsService(defaultSettingsService);
  } catch {
    // Ignore cleanup errors
  }
});

describe('LLM Settings API & Service (/api/settings/llm)', () => {
  let authCookie = null;
  let testUserId = null;
  const rawApiKey = 'sk-or-v1-abcdefghijklmnopqrstuvwxyz1234567890';
  let fakeChatMock = vi.fn();

  beforeEach(async () => {
    await User.deleteMany({});
    fakeChatMock = vi.fn(async () => ({
      content: 'OK',
      model: 'test-model',
    }));

    const service = createSettingsService({
      models: { User },
      env,
      openrouterClient: { chat: fakeChatMock },
    });
    setSettingsService(service);

    // Create a fresh test user directly in DB to avoid hitting IP auth rate limiter
    const user = await User.create({
      name: 'LLM Student',
      email: 'llm.student@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      role: 'student',
    });

    testUserId = user._id.toString();
    const token = signToken({ sub: testUserId, role: 'student' });
    authCookie = `sg_token=${token}`;
  });

  describe('Authentication guard', () => {
    it('unauthenticated calls give 401 on all endpoints', async () => {
      const getRes = await request(app).get('/api/settings/llm');
      expect(getRes.status).toBe(401);

      const putRes = await request(app)
        .put('/api/settings/llm')
        .send({ apiKey: rawApiKey });
      expect(putRes.status).toBe(401);

      const deleteRes = await request(app).delete('/api/settings/llm/key');
      expect(deleteRes.status).toBe(401);

      const testRes = await request(app).post('/api/settings/llm/test');
      expect(testRes.status).toBe(401);

      const modelsRes = await request(app).get('/api/settings/llm/suggested-models');
      expect(modelsRes.status).toBe(401);
    });
  });

  describe('Validation (PUT /api/settings/llm)', () => {
    it('invalid keys (too short, with space) and invalid model strings give 400', async () => {
      // Key too short (< 20 chars)
      const resTooShort = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({ apiKey: 'sk-short' });
      expect(resTooShort.status).toBe(400);

      // Key with whitespace
      const resWithSpace = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({ apiKey: 'sk-or-v1-abcdefghij klmnopqrstuvwxyz' });
      expect(resWithSpace.status).toBe(400);

      // Invalid model identifier
      const resInvalidModel = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({ model: 'invalid model with spaces!' });
      expect(resInvalidModel.status).toBe(400);

      // Empty body (no fields provided)
      const resEmpty = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({});
      expect(resEmpty.status).toBe(400);

      // Extra unknown field rejected by strict schema
      const resUnknownField = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({ apiKey: rawApiKey, hacked: true });
      expect(resUnknownField.status).toBe(400);
    });
  });

  describe('Save, encrypt, and retrieve key (PUT & GET)', () => {
    it('PUT saves, the response never contains the raw key, and DB document has ciphertext with no plaintext', async () => {
      const putRes = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({
          apiKey: rawApiKey,
          model: 'openai/gpt-4o-mini',
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);

      const responseString = JSON.stringify(putRes.body);
      // Security check: response never contains the raw key
      expect(responseString).not.toContain(rawApiKey);

      expect(putRes.body.data.hasKey).toBe(true);
      expect(putRes.body.data.keyLast4).toBe(rawApiKey.slice(-4));
      expect(putRes.body.data.model).toBe('openai/gpt-4o-mini');
      expect(putRes.body.data.provider).toBe('openrouter');

      // Verify the stored database document
      const storedUser = await User.findById(testUserId).select('+llmSettings.apiKeyEnc');
      expect(storedUser.llmSettings.apiKeyEnc).toBeDefined();
      expect(storedUser.llmSettings.apiKeyEnc.ciphertext).toBeDefined();
      expect(storedUser.llmSettings.apiKeyEnc.ciphertext).not.toBe(rawApiKey);

      // Ensure no plaintext key exists in the database document
      const docString = JSON.stringify(storedUser.toObject());
      expect(docString).not.toContain(rawApiKey);
    });

    it('GET after PUT shows hasKey true, the right keyLast4, and model', async () => {
      await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({
          apiKey: rawApiKey,
          model: 'meta-llama/llama-3.3-70b-instruct:free',
        });

      const getRes = await request(app)
        .get('/api/settings/llm')
        .set('Cookie', authCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.hasKey).toBe(true);
      expect(getRes.body.data.keyLast4).toBe(rawApiKey.slice(-4));
      expect(getRes.body.data.model).toBe('meta-llama/llama-3.3-70b-instruct:free');
      expect(JSON.stringify(getRes.body)).not.toContain(rawApiKey);
    });
  });

  describe('Delete key (DELETE /api/settings/llm/key)', () => {
    it('DELETE /key clears the key, keeps the saved model, and returns updated settings', async () => {
      // First save key and model
      await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({
          apiKey: rawApiKey,
          model: 'qwen/qwen-2.5-72b-instruct',
        });

      // Now delete the key
      const deleteRes = await request(app)
        .delete('/api/settings/llm/key')
        .set('Cookie', authCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.hasKey).toBe(false);
      expect(deleteRes.body.data.keyLast4).toBeNull();
      expect(deleteRes.body.data.model).toBe('qwen/qwen-2.5-72b-instruct');

      // Verify DB document has no apiKeyEnc or apiKeyLast4
      const userInDb = await User.findById(testUserId).select('+llmSettings.apiKeyEnc');
      expect(userInDb.llmSettings?.apiKeyEnc).toBeUndefined();
      expect(userInDb.llmSettings?.apiKeyLast4).toBeUndefined();
      expect(userInDb.llmSettings?.model).toBe('qwen/qwen-2.5-72b-instruct');
    });
  });

  describe('Test key (POST /api/settings/llm/test)', () => {
    it('testKey succeeds and returns { ok: true, model }', async () => {
      await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({
          apiKey: rawApiKey,
          model: 'deepseek/deepseek-r1:free',
        });

      const testRes = await request(app)
        .post('/api/settings/llm/test')
        .set('Cookie', authCookie);

      expect(testRes.status).toBe(200);
      expect(testRes.body.data).toEqual({
        ok: true,
        model: 'deepseek/deepseek-r1:free',
      });
      expect(fakeChatMock).toHaveBeenCalledTimes(1);
    });

    it('testKey with a fake 401 error gives 502 UPSTREAM_ERROR with friendly message', async () => {
      fakeChatMock.mockRejectedValueOnce(new LlmError('auth', 'Invalid API key provided'));

      await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({ apiKey: rawApiKey });

      const testRes = await request(app)
        .post('/api/settings/llm/test')
        .set('Cookie', authCookie);

      expect(testRes.status).toBe(502);
      expect(testRes.body.error.code).toBe('UPSTREAM_ERROR');
      expect(testRes.body.error.message).toBe('The key was rejected by OpenRouter.');
    });

    it('testKey with no user key and no server key gives 422', async () => {
      // Create service without server key
      const service = createSettingsService({
        models: { User },
        env: { ...env, OPENROUTER_API_KEY: '' },
        openrouterClient: { chat: fakeChatMock },
      });
      setSettingsService(service);

      const testRes = await request(app)
        .post('/api/settings/llm/test')
        .set('Cookie', authCookie);

      expect(testRes.status).toBe(422);
      expect(testRes.body.error.code).toBe('RULE_VIOLATION');
      expect(testRes.body.error.message).toContain('No key available');
    });
  });

  describe('serverKeyRemainingToday quota calculation', () => {
    it('counts down with a usage record of today and resets with an older date', async () => {
      const today = '2026-10-08';
      const yesterday = '2026-10-07';

      // 1. Usage today: 10 calls used out of 30 limit -> 20 remaining
      await User.findByIdAndUpdate(testUserId, {
        serverKeyUsage: { date: today, count: 10 },
      });

      const serviceToday = createSettingsService({
        models: { User },
        env: { ...env, SERVER_KEY_DAILY_LIMIT: 30 },
        now: () => new Date(`${today}T12:00:00.000Z`),
      });
      const settingsToday = await serviceToday.getSettings(testUserId);
      expect(settingsToday.serverKeyRemainingToday).toBe(20);

      // 2. Usage from yesterday: 28 used -> resets today to 30 remaining
      await User.findByIdAndUpdate(testUserId, {
        serverKeyUsage: { date: yesterday, count: 28 },
      });

      const settingsReset = await serviceToday.getSettings(testUserId);
      expect(settingsReset.serverKeyRemainingToday).toBe(30);
    });
  });

  describe('suggestedModels (GET /api/settings/llm/suggested-models)', () => {
    it('returns models from SUGGESTED_MODELS env or empty list when unset', async () => {
      const serviceWithModels = createSettingsService({
        models: { User },
        env: { ...env, SUGGESTED_MODELS: 'model-a, model-b, model-c' },
      });
      setSettingsService(serviceWithModels);

      const res = await request(app)
        .get('/api/settings/llm/suggested-models')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([
        { id: 'model-a', note: '' },
        { id: 'model-b', note: '' },
        { id: 'model-c', note: '' },
      ]);

      // When unset
      const serviceEmpty = createSettingsService({
        models: { User },
        env: { ...env, SUGGESTED_MODELS: '' },
      });
      setSettingsService(serviceEmpty);

      const resEmpty = await request(app)
        .get('/api/settings/llm/suggested-models')
        .set('Cookie', authCookie);

      expect(resEmpty.status).toBe(200);
      expect(resEmpty.body.data.items).toEqual([]);
    });
  });

  describe('Logging security guarantee', () => {
    it('fails if the raw API key text appears in any log line', async () => {
      const warnSpy = vi.spyOn(logger, 'warn');
      const infoSpy = vi.spyOn(logger, 'info');
      const errorSpy = vi.spyOn(logger, 'error');

      await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authCookie)
        .send({ apiKey: rawApiKey });

      await request(app)
        .post('/api/settings/llm/test')
        .set('Cookie', authCookie);

      const allLoggedCalls = [
        ...warnSpy.mock.calls,
        ...infoSpy.mock.calls,
        ...errorSpy.mock.calls,
      ];
      for (const callArgs of allLoggedCalls) {
        const text = JSON.stringify(callArgs);
        expect(text).not.toContain(rawApiKey);
      }

      warnSpy.mockRestore();
      infoSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
