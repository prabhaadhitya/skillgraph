import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const careerQuerySchema = z
  .object({
    career: z
      .string()
      .trim()
      .regex(slugRegex, 'Invalid career slug format (must be kebab-case)')
      .optional(),
  })
  .strict();

export const graphQuerySchema = z
  .object({
    career: z
      .string()
      .trim()
      .regex(slugRegex, 'Invalid career slug format (must be kebab-case)')
      .optional(),
    related: z.string().optional(),
    includeRelated: z.string().optional(),
  })
  .strict();

export const whatIfBodySchema = z
  .object({
    careerSlug: z
      .string()
      .trim()
      .regex(slugRegex, 'Invalid career slug format (must be kebab-case)'),
  })
  .strict();

export const careerCompareQuerySchema = z
  .object({
    a: z
      .string()
      .trim()
      .regex(slugRegex, 'Career slug "a" must be kebab-case'),
    b: z
      .string()
      .trim()
      .regex(slugRegex, 'Career slug "b" must be kebab-case'),
  })
  .strict()
  .refine((data) => data.a !== data.b, {
    message: 'Cannot compare a career with itself. Please choose two different careers.',
    path: ['b'],
  });

export default {
  careerQuerySchema,
  graphQuerySchema,
  whatIfBodySchema,
  careerCompareQuerySchema,
};
