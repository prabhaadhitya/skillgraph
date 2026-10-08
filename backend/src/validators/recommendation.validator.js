import { z } from 'zod';

/**
 * Validation schema for query parameters in next skills recommendations
 * GET /api/recommendations/next-skills?career=&limit=3&strategy=auto
 */
export const nextSkillsQuerySchema = z
  .object({
    career: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(20).optional().default(3),
    strategy: z.enum(['auto', 'rule', 'ml']).optional().default('auto'),
  })
  .strip();

export default {
  nextSkillsQuerySchema,
};
