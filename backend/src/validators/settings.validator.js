import { z } from 'zod';

/**
 * Validation schema for updating user LLM settings (PUT /api/settings/llm).
 * Enforces strict object, apiKey 20-200 chars without whitespace,
 * model <= 120 chars matching safe identifier regex, and at least one field present.
 */
export const updateSettingsSchema = z
  .object({
    apiKey: z
      .string()
      .min(20, 'API key must be between 20 and 200 characters')
      .max(200, 'API key must be between 20 and 200 characters')
      .regex(/^\S+$/, 'API key must not contain whitespace')
      .optional(),
    model: z
      .string()
      .min(1, 'Model identifier must not be empty')
      .max(120, 'Model identifier cannot exceed 120 characters')
      .regex(/^[A-Za-z0-9._:/-]+$/, 'Model identifier contains invalid characters')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (apiKey or model) is required',
  });

export default {
  updateSettingsSchema,
};
