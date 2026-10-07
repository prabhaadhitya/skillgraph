import { z } from 'zod';

export const patchUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name cannot exceed 120 characters').optional(),
    college: z.string().trim().max(120, 'College cannot exceed 120 characters').optional(),
    degree: z.string().trim().max(120, 'Degree cannot exceed 120 characters').optional(),
    branch: z.string().trim().max(120, 'Branch cannot exceed 120 characters').optional(),
    semester: z.number().int('Semester must be an integer').min(1, 'Semester must be between 1 and 8').max(8, 'Semester must be between 1 and 8').optional(),
    targetCareerSlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Invalid slug format (must be lowercase kebab-case)')
      .optional(),
    onboardingCompleted: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export default {
  patchUserSchema,
};
