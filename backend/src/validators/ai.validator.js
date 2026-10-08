import { z } from 'zod';

/**
 * Validation schema for student chat query (POST /api/ai/chat).
 * Max message length: 500 characters.
 */
export const chatSchema = z
  .object({
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(1, 'Message cannot be empty')
      .max(500, 'Message cannot exceed 500 characters'),
  })
  .strict();

/**
 * Validation schema for skill explanation request (POST /api/ai/explain).
 */
export const explainSchema = z
  .object({
    skillSlug: z
      .string({ required_error: 'skillSlug is required' })
      .trim()
      .min(1, 'skillSlug cannot be empty')
      .max(80, 'skillSlug cannot exceed 80 characters'),
  })
  .strict();

/**
 * Validation schema for query parameters in chat history (GET /api/ai/history).
 */
export const historyQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  })
  .strip();

export default {
  chatSchema,
  explainSchema,
  historyQuerySchema,
};
