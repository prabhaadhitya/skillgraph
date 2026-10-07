import { z } from 'zod';
import { CATEGORY_SLUGS } from '../config/constants.js';

export const skillsQuerySchema = z
  .object({
    category: z.enum(CATEGORY_SLUGS, {
      errorMap: () => ({ message: `Category must be one of: ${CATEGORY_SLUGS.join(', ')}` }),
    }).optional(),
    q: z.string().trim().max(60, 'Search query cannot exceed 60 characters').optional(),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
  })
  .strict();

export default {
  skillsQuerySchema,
};
