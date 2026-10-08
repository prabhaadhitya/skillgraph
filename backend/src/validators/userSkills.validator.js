import { z } from 'zod';

export const skillSlugSchema = z
  .string({
    required_error: 'skillSlug is required',
    invalid_type_error: 'skillSlug must be a string',
  })
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Invalid skillSlug format (must be lowercase kebab-case)');

export const proficiencySchema = z
  .number({
    required_error: 'proficiency is required',
    invalid_type_error: 'proficiency must be an integer between 0 and 5',
  })
  .int('proficiency must be an integer')
  .min(0, 'proficiency must be between 0 and 5')
  .max(5, 'proficiency must be between 0 and 5');

export const putSkillsSchema = z
  .object({
    skills: z.array(
      z
        .object({
          skillSlug: skillSlugSchema,
          proficiency: proficiencySchema,
        })
        .strict(),
      {
        required_error: 'skills array is required',
        invalid_type_error: 'skills must be an array',
      },
    ),
  })
  .strict();

export const patchSkillSchema = z
  .object({
    proficiency: proficiencySchema,
  })
  .strict();

export const skillParamSchema = z
  .object({
    skillSlug: skillSlugSchema,
  })
  .strict();

export default {
  skillSlugSchema,
  proficiencySchema,
  putSkillsSchema,
  patchSkillSchema,
  skillParamSchema,
};
