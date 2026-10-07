import { z } from 'zod';

export const slugParamSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Invalid slug format (must be lowercase kebab-case)'),
  })
  .strict();
