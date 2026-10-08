import { z } from 'zod';
import { CATEGORY_SLUGS } from '../config/constants.js';

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const postSkillSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name cannot exceed 120 characters'),
    slug: z.string().trim().regex(slugRegex, 'Slug must be lowercase kebab-case'),
    description: z.string().trim().max(300, 'Description cannot exceed 300 characters').optional().default(''),
    category: z.enum(CATEGORY_SLUGS, {
      errorMap: () => ({ message: 'Invalid skill category' }),
    }),
    difficulty: z
      .number({ required_error: 'Difficulty is required' })
      .int('Difficulty must be an integer')
      .min(1, 'Difficulty must be between 1 and 5')
      .max(5, 'Difficulty must be between 1 and 5'),
  })
  .strict();

export const patchSkillSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name cannot exceed 120 characters').optional(),
    description: z.string().trim().max(300, 'Description cannot exceed 300 characters').optional(),
    category: z.enum(CATEGORY_SLUGS, {
      errorMap: () => ({ message: 'Invalid skill category' }),
    }).optional(),
    difficulty: z
      .number()
      .int('Difficulty must be an integer')
      .min(1, 'Difficulty must be between 1 and 5')
      .max(5, 'Difficulty must be between 1 and 5')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

export const skillParamSchema = z
  .object({
    slug: z.string().trim().regex(slugRegex, 'Invalid slug format'),
  })
  .strict();

export const postRelationshipSchema = z
  .object({
    source: z.string().trim().regex(slugRegex, 'Source must be lowercase kebab-case'),
    target: z.string().trim().regex(slugRegex, 'Target must be lowercase kebab-case'),
    type: z.enum(['PREREQUISITE', 'RELATED_TO'], {
      errorMap: () => ({ message: 'Type must be PREREQUISITE or RELATED_TO' }),
    }),
    strength: z.number().min(0).max(1).optional().default(1),
  })
  .strict();

export const relationshipQuerySchema = z
  .object({
    skill: z.string().trim().regex(slugRegex, 'Skill query must be lowercase kebab-case').optional(),
  })
  .strict();

export const relationshipIdParamSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid relationship id format'),
  })
  .strict();

export const postCareerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name cannot exceed 120 characters'),
    slug: z.string().trim().regex(slugRegex, 'Slug must be lowercase kebab-case'),
    description: z.string().trim().max(400, 'Description cannot exceed 400 characters').optional().default(''),
    category: z.enum(['software', 'data', 'ai'], {
      errorMap: () => ({ message: 'Category must be software, data, or ai' }),
    }),
    icon: z.string().trim().optional().default('briefcase'),
  })
  .strict();

export const patchCareerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name cannot exceed 120 characters').optional(),
    description: z.string().trim().max(400, 'Description cannot exceed 400 characters').optional(),
    category: z.enum(['software', 'data', 'ai']).optional(),
    icon: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

export const careerParamSchema = z
  .object({
    slug: z.string().trim().regex(slugRegex, 'Invalid slug format'),
  })
  .strict();

export const putCareerSkillsSchema = z
  .object({
    skills: z.array(
      z
        .object({
          skillSlug: z.string().trim().regex(slugRegex, 'Skill slug must be lowercase kebab-case'),
          importance: z.number().min(0, 'Importance must be between 0 and 1').max(1, 'Importance must be between 0 and 1'),
          requiredLevel: z
            .number()
            .int('Required level must be an integer')
            .min(1, 'Required level must be between 1 and 5')
            .max(5, 'Required level must be between 1 and 5'),
        })
        .strict(),
      { required_error: 'Skills array is required' },
    ),
  })
  .strict();

export default {
  postSkillSchema,
  patchSkillSchema,
  skillParamSchema,
  postRelationshipSchema,
  relationshipQuerySchema,
  relationshipIdParamSchema,
  postCareerSchema,
  patchCareerSchema,
  careerParamSchema,
  putCareerSkillsSchema,
};
