import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const WEAK_ML_INTERNAL_KEYS = new Set([
  'dev-internal-key',
  'your_ml_internal_key_placeholder',
  'your_development_shared_internal_key_min_16_chars',
  'changeme',
  'secret',
  'password',
  'admin',
  'test',
  'default',
]);

export const WEAK_JWT_SECRETS = new Set([
  'your_32_character_minimum_random_secret_here',
  'a_very_long_secure_random_string_with_32_plus_chars',
  'changeme',
  'secret',
  'default',
  'password',
  'admin',
  'test',
]);

export const WEAK_ENCRYPTION_SECRETS = new Set([
  'your_base64_encoded_32_bytes_secret',
  '4v7b1xp9qk2mn8wl0zt5ry3se6ui1oa8',
  'changeme',
  'secret',
  'default',
  'password',
  'test',
]);

export function isStrongMlInternalKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 16) return false;
  if (WEAK_ML_INTERNAL_KEYS.has(trimmed.toLowerCase())) return false;
  return true;
}

export function isValid32ByteBase64Secret(secret) {
  if (!secret || typeof secret !== 'string') return false;
  const trimmed = secret.trim();
  try {
    const buf = Buffer.from(trimmed, 'base64');
    return buf.length === 32;
  } catch {
    return false;
  }
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

    // Optional variables (Member 5 and seed use them)
    COOKIE_SECURE: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
      .optional(),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
    ENFORCE_CSRF: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
      .optional(),
    ENABLE_USER_API_KEYS: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
      .optional(),
    LLM_KEY_ENCRYPTION_SECRET: z.string().optional(),
    OPENROUTER_BASE_URL: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_DEFAULT_MODEL: z.string().optional(),
    SERVER_KEY_DAILY_LIMIT: z.coerce.number().optional(),
    LLM_TIMEOUT_MS: z.coerce.number().optional(),
    ML_SERVICE_URL: z.string().optional(),
    ML_INTERNAL_KEY: z.string().optional(),
    ML_TIMEOUT_MS: z.coerce.number().optional(),
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    DEMO_PASSWORD: z.string().optional(),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().optional(),
    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    const isProd = data.NODE_ENV === 'production';
    const userKeysEnabled = data.ENABLE_USER_API_KEYS === true;

    // LLM_KEY_ENCRYPTION_SECRET enforcement when user API keys are enabled
    if (userKeysEnabled) {
      if (!data.LLM_KEY_ENCRYPTION_SECRET || !data.LLM_KEY_ENCRYPTION_SECRET.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LLM_KEY_ENCRYPTION_SECRET'],
          message:
            'LLM_KEY_ENCRYPTION_SECRET is required when encrypted user API keys are enabled',
        });
      }
    }

    if (data.LLM_KEY_ENCRYPTION_SECRET && data.LLM_KEY_ENCRYPTION_SECRET.trim()) {
      const trimmedSecret = data.LLM_KEY_ENCRYPTION_SECRET.trim();
      if (!isValid32ByteBase64Secret(trimmedSecret)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LLM_KEY_ENCRYPTION_SECRET'],
          message:
            'LLM_KEY_ENCRYPTION_SECRET must be a valid base64-encoded string that decodes to exactly 32 bytes',
        });
      } else if (isProd && WEAK_ENCRYPTION_SECRETS.has(trimmedSecret.toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LLM_KEY_ENCRYPTION_SECRET'],
          message:
            'LLM_KEY_ENCRYPTION_SECRET must be a unique, randomly generated 32-byte secret (not a placeholder) in production',
        });
      }
    }

    if (isProd) {
      // Production JWT_SECRET validation
      if (WEAK_JWT_SECRETS.has(data.JWT_SECRET.trim().toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be a unique, strong random secret (not a placeholder) in production',
        });
      }

      // Production MONGODB_URI validation
      const mongoUri = data.MONGODB_URI.trim();
      if (
        mongoUri.includes('<username>') ||
        mongoUri.includes('<password>') ||
        mongoUri.includes('<cluster>')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message:
            'MONGODB_URI must be a production database URI (e.g. MongoDB Atlas) and cannot contain placeholders in production',
        });
      }

      // Production CLIENT_ORIGIN validation
      const origin = data.CLIENT_ORIGIN.trim();
      if (origin === '*') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLIENT_ORIGIN'],
          message:
            'CLIENT_ORIGIN must be configured with your production frontend origin and cannot be wildcard (*) in production',
        });
      }

      // Production COOKIE_SECURE validation
      if (data.COOKIE_SECURE === false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE cannot be false in production; HTTPS cookies are required',
        });
      }

      // Production ML validation
      const mlUrl = data.ML_SERVICE_URL ? data.ML_SERVICE_URL.trim() : '';
      if (mlUrl) {
        if (!data.ML_INTERNAL_KEY || !isStrongMlInternalKey(data.ML_INTERNAL_KEY)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ML_INTERNAL_KEY'],
            message:
              'ML_INTERNAL_KEY is required and must be a strong secret of at least 16 characters (not a placeholder) in production when ML_SERVICE_URL is set',
          });
        }
      } else if (data.ML_INTERNAL_KEY && !isStrongMlInternalKey(data.ML_INTERNAL_KEY)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ML_INTERNAL_KEY'],
          message:
            'ML_INTERNAL_KEY must be a strong secret of at least 16 characters (not a placeholder) in production',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formattedErrors = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Fail fast with clear message listing missing or invalid variables
  throw new Error(`Environment validation failed:\n${formattedErrors}`);
}

export const env = parsed.data;
export default env;
