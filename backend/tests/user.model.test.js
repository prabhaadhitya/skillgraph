import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';
import { User } from '../src/models/user.model.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

let mongoServer = null;

beforeAll(async () => {
  // Use TEST_MONGODB_URI or local MongoDB instance, falling back to MongoMemoryServer
  // (matches docs/TESTING.md §2: "API tests use an in-memory MongoDB (fallback: separate DB skillgraph_test via TEST_MONGODB_URI)")
  const testUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/skillgraph_test';
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
  } catch {
    mongoServer = await MongoMemoryServer.create({
      spawn: { timeout: 30000 },
    });
    await mongoose.connect(mongoServer.getUri());
  }

  await User.deleteMany({});
  await User.syncIndexes();
});

afterAll(async () => {
  try {
    await User.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors during shutdown
  }
});

describe('User Model & Constraints', () => {
  it('creating a user never exposes passwordHash in toJSON', async () => {
    const user = await User.create({
      name: 'Test Student',
      email: 'student@example.com',
      passwordHash: 'secret_bcrypt_hash_value',
      llmSettings: {
        provider: 'openrouter',
        apiKeyEnc: {
          iv: 'iv_val',
          tag: 'tag_val',
          ciphertext: 'cipher_val',
        },
        apiKeyLast4: '1234',
      },
    });

    const json = user.toJSON();
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.passwordHash).toBeUndefined();
    expect(json.llmSettings.apiKeyEnc).toBeUndefined();
    expect(json.llmSettings.apiKeyLast4).toBe('1234');

    const serialized = JSON.stringify(user);
    expect(serialized).not.toContain('secret_bcrypt_hash_value');
    expect(serialized).not.toContain('cipher_val');
  });

  it('unique email gives a duplicate error that errorHandler maps to 409 CONFLICT', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/test-duplicate', async (req, res, next) => {
      try {
        await User.create({
          name: 'Another Student',
          email: 'student@example.com', // Duplicate email
          passwordHash: 'another_secret_hash',
        });
        res.status(201).json({ success: true });
      } catch (err) {
        next(err);
      }
    });
    testApp.use(errorHandler);

    const res = await request(testApp).post('/test-duplicate').send({});
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('email');
  });
});
