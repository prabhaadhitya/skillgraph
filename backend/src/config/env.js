import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
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
