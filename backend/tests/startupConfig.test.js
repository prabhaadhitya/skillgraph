import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  envSchema,
  isStrongMlInternalKey,
  isValid32ByteBase64Secret,
} from '../src/config/env.js';
import { seedDemoUsers } from '../seed/seedDemo.js';
import { validateProductionStartup } from '../src/server.js';
import { validateProductionBuild } from '../../frontend/vite.config.js';

describe('Production Startup, Release Configuration & Secret Validation', () => {
  const validSecret32 = crypto.randomBytes(32).toString('base64');

  const validProdEnv = {
    NODE_ENV: 'production',
    PORT: '5000',
    MONGODB_URI: 'mongodb+srv://admin:securepass123@cluster0.abcde.mongodb.net/skillgraph?retryWrites=true&w=majority',
    JWT_SECRET: 'super-secure-production-jwt-signing-secret-with-plenty-of-entropy',
    JWT_EXPIRES_IN: '7d',
    CLIENT_ORIGIN: 'https://skillgraph.vercel.app',
    COOKIE_SECURE: 'true',
    ENABLE_USER_API_KEYS: 'true',
    LLM_KEY_ENCRYPTION_SECRET: validSecret32,
    ML_SERVICE_URL: 'https://skillgraph-ml.onrender.com',
    ML_INTERNAL_KEY: 'production-ml-shared-key-min-16-chars-safe',
  };

  describe('1. Demo-Account Seeding Prevention in Production', () => {
    it('refuses to seed demo accounts when NODE_ENV is production', async () => {
      const mockModels = {
        User: { findOne: vi.fn(), create: vi.fn() },
        Career: { find: vi.fn().mockResolvedValue([]) },
        Skill: { find: vi.fn().mockResolvedValue([]) },
        UserSkill: {},
        AlignmentSnapshot: {},
      };

      await expect(
        seedDemoUsers({
          models: mockModels,
          options: { env: 'production' },
        }),
      ).rejects.toThrow(/Refused to seed demo accounts: NODE_ENV is "production"/);
    });

    it('does not block seeding when NODE_ENV is development or test', async () => {
      let threwProductionError = false;
      try {
        await seedDemoUsers({
          models: {},
          options: { env: 'development' },
        });
      } catch (err) {
        if (err.message.includes('NODE_ENV is "production"')) {
          threwProductionError = true;
        }
      }
      expect(threwProductionError).toBe(false);
    });
  });

  describe('2. Secret & Encryption Key Validation (LLM_KEY_ENCRYPTION_SECRET)', () => {
    it('requires LLM_KEY_ENCRYPTION_SECRET when ENABLE_USER_API_KEYS is true', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        NODE_ENV: 'development',
        ENABLE_USER_API_KEYS: 'true',
        LLM_KEY_ENCRYPTION_SECRET: '',
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('LLM_KEY_ENCRYPTION_SECRET is required'))).toBe(true);
    });

    it('requires LLM_KEY_ENCRYPTION_SECRET in production by default', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        LLM_KEY_ENCRYPTION_SECRET: '',
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('LLM_KEY_ENCRYPTION_SECRET is required'))).toBe(true);
    });

    it('permits omitting LLM_KEY_ENCRYPTION_SECRET when ENABLE_USER_API_KEYS is explicitly false', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        ENABLE_USER_API_KEYS: 'false',
        LLM_KEY_ENCRYPTION_SECRET: undefined,
      });

      expect(parsed.success).toBe(true);
      expect(parsed.data.ENABLE_USER_API_KEYS).toBe(false);
    });

    it('rejects malformed or non-32-byte base64 secret', () => {
      // 24-byte secret (32 base64 characters)
      const invalid24Byte = '0123456789abcdef0123456789abcdef';

      const parsed = envSchema.safeParse({
        ...validProdEnv,
        LLM_KEY_ENCRYPTION_SECRET: invalid24Byte,
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('decodes to exactly 32 bytes'))).toBe(true);
    });

    it('rejects weak placeholder LLM encryption secrets in production', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        LLM_KEY_ENCRYPTION_SECRET: 'your_base64_encoded_32_bytes_secret',
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('LLM_KEY_ENCRYPTION_SECRET'))).toBe(true);
    });

    it('accepts valid 32-byte base64 secret', () => {
      expect(isValid32ByteBase64Secret(validSecret32)).toBe(true);
      const parsed = envSchema.safeParse(validProdEnv);
      expect(parsed.success).toBe(true);
      expect(parsed.data.LLM_KEY_ENCRYPTION_SECRET).toBe(validSecret32);
    });
  });

  describe('3. Required Production Secrets Validation', () => {
    it('rejects weak or placeholder JWT_SECRET in production', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        JWT_SECRET: 'your_32_character_minimum_random_secret_here',
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('JWT_SECRET must be a unique, strong random secret'))).toBe(true);
    });

    it('rejects placeholder MONGODB_URI in production', () => {
      const withPlaceholder = envSchema.safeParse({
        ...validProdEnv,
        MONGODB_URI: 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/skillgraph',
      });
      expect(withPlaceholder.success).toBe(false);
      const issues = withPlaceholder.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('cannot contain placeholders'))).toBe(true);
    });

    it('rejects wildcard (*) CLIENT_ORIGIN in production', () => {
      const withWildcard = envSchema.safeParse({
        ...validProdEnv,
        CLIENT_ORIGIN: '*',
      });
      expect(withWildcard.success).toBe(false);
      const issues = withWildcard.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('cannot be wildcard (*)'))).toBe(true);
    });

    it('rejects CLIENT_ORIGIN containing localhost in production', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        CLIENT_ORIGIN: 'http://localhost:5173',
      });
      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues).toContain('CLIENT_ORIGIN must be your production frontend origin in production');
    });

    it('rejects CLIENT_ORIGIN containing 127.0.0.1 in production', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        CLIENT_ORIGIN: 'http://127.0.0.1:5173',
      });
      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues).toContain('CLIENT_ORIGIN must be your production frontend origin in production');
    });

    it('rejects COOKIE_SECURE=false in production', () => {
      const parsed = envSchema.safeParse({
        ...validProdEnv,
        COOKIE_SECURE: 'false',
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('COOKIE_SECURE cannot be false in production'))).toBe(true);
    });

    it('rejects missing or weak ML_INTERNAL_KEY when ML_SERVICE_URL is set in production', () => {
      expect(isStrongMlInternalKey('your_ml_internal_key_placeholder')).toBe(false);
      expect(isStrongMlInternalKey('short-key')).toBe(false);
      expect(isStrongMlInternalKey('production-ml-shared-key-min-16-chars-safe')).toBe(true);

      const parsed = envSchema.safeParse({
        ...validProdEnv,
        ML_INTERNAL_KEY: 'your_ml_internal_key_placeholder',
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.error.issues.map((i) => i.message);
      expect(issues.some((msg) => msg.includes('ML_INTERNAL_KEY is required and must be a strong secret'))).toBe(true);
    });
  });

  describe('4. Mock API Mode Prevention in Production', () => {
    it('blocks frontend build in production mode if VITE_USE_MOCKS is true', () => {
      expect(() => {
        validateProductionBuild('production', { VITE_USE_MOCKS: 'true' });
      }).toThrow(/Refused to build with VITE_USE_MOCKS=true in production/);
    });

    it('permits frontend build in production mode when VITE_USE_MOCKS is false or unset', () => {
      expect(() => {
        validateProductionBuild('production', { VITE_USE_MOCKS: 'false' });
      }).not.toThrow();

      expect(() => {
        validateProductionBuild('production', {});
      }).not.toThrow();
    });

    it('permits VITE_USE_MOCKS in development mode', () => {
      expect(() => {
        validateProductionBuild('development', { VITE_USE_MOCKS: 'true' });
      }).not.toThrow();
    });
  });

  describe('5. Production Startup Audit Function', () => {
    it('passes audit when production configuration is fully valid', async () => {
      await expect(validateProductionStartup(validProdEnv)).resolves.not.toThrow();
    });
  });
});
