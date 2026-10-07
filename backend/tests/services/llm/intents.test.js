import { describe, it, expect } from 'vitest';
import {
  ALLOWED_INTENTS,
  validateIntent,
  keywordRouter,
  parseIntentJson,
} from '../../../src/services/llm/intents.js';

describe('services/llm/intents', () => {
  const skillSlugs = new Set(['sql', 'python', 'javascript', 'typescript', 'c-plus-plus', 'nodejs', 'react', 'docker']);
  const careerSlugs = new Set(['data-scientist', 'machine-learning-engineer', 'frontend-developer']);

  const catalog = {
    skills: [
      { slug: 'sql', name: 'SQL' },
      { slug: 'python', name: 'Python' },
      { slug: 'javascript', name: 'JavaScript' },
      { slug: 'typescript', name: 'TypeScript' },
      { slug: 'c-plus-plus', name: 'C++' },
      { slug: 'nodejs', name: 'Node.js' },
      { slug: 'react', name: 'React' },
      { slug: 'docker', name: 'Docker' },
    ],
    careers: [
      { slug: 'data-scientist', name: 'Data Scientist' },
      { slug: 'machine-learning-engineer', name: 'ML Engineer' },
      { slug: 'frontend-developer', name: 'Frontend Developer' },
    ],
  };

  describe('ALLOWED_INTENTS', () => {
    it('contains all 7 required intents', () => {
      expect(ALLOWED_INTENTS).toEqual([
        'explain_skill',
        'explain_recommendation',
        'time_boxed_plan',
        'what_if',
        'skill_relationship',
        'progress_summary',
        'out_of_scope',
      ]);
    });
  });

  describe('validateIntent', () => {
    it('returns out_of_scope for invalid or unknown intent', () => {
      expect(validateIntent(null, { skillSlugs, careerSlugs })).toEqual({
        intent: 'out_of_scope',
        params: {},
      });
      expect(validateIntent({ intent: 'hack_system' }, { skillSlugs, careerSlugs })).toEqual({
        intent: 'out_of_scope',
        params: {},
      });
    });

    it('validates explain_skill params', () => {
      expect(
        validateIntent(
          { intent: 'explain_skill', params: { skillSlug: 'sql' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'explain_skill',
        params: { skillSlug: 'sql' },
      });

      // Unknown skill drops to out_of_scope
      expect(
        validateIntent(
          { intent: 'explain_skill', params: { skillSlug: 'unknown-skill' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'out_of_scope',
        params: {},
      });

      // Missing param drops to out_of_scope
      expect(
        validateIntent(
          { intent: 'explain_skill', params: {} },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'out_of_scope',
        params: {},
      });
    });

    it('validates explain_recommendation with optional skillSlug', () => {
      // With valid skill
      expect(
        validateIntent(
          { intent: 'explain_recommendation', params: { skillSlug: 'python' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'explain_recommendation',
        params: { skillSlug: 'python' },
      });

      // With unknown skill, drops param but preserves intent
      expect(
        validateIntent(
          { intent: 'explain_recommendation', params: { skillSlug: 'nonexistent' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'explain_recommendation',
        params: {},
      });

      // With no params
      expect(
        validateIntent({ intent: 'explain_recommendation' }, { skillSlugs, careerSlugs }),
      ).toEqual({
        intent: 'explain_recommendation',
        params: {},
      });
    });

    it('validates and clamps time_boxed_plan weeks between 1 and 52', () => {
      expect(
        validateIntent(
          { intent: 'time_boxed_plan', params: { weeks: 12 } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 12 },
      });

      // Clamps > 52 to 52
      expect(
        validateIntent(
          { intent: 'time_boxed_plan', params: { weeks: 100 } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 52 },
      });

      // Clamps < 1 to 1
      expect(
        validateIntent(
          { intent: 'time_boxed_plan', params: { weeks: -5 } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 1 },
      });

      // Defaults invalid weeks to 8
      expect(
        validateIntent(
          { intent: 'time_boxed_plan', params: { weeks: 'invalid' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 8 },
      });
    });

    it('validates what_if careerSlug', () => {
      expect(
        validateIntent(
          { intent: 'what_if', params: { careerSlug: 'machine-learning-engineer' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'what_if',
        params: { careerSlug: 'machine-learning-engineer' },
      });

      // Unknown career drops to out_of_scope
      expect(
        validateIntent(
          { intent: 'what_if', params: { careerSlug: 'astronaut' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'out_of_scope',
        params: {},
      });
    });

    it('validates skill_relationship required and optional skills', () => {
      expect(
        validateIntent(
          { intent: 'skill_relationship', params: { skillSlug: 'javascript', otherSkillSlug: 'typescript' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'skill_relationship',
        params: { skillSlug: 'javascript', otherSkillSlug: 'typescript' },
      });

      // When otherSkillSlug is unknown, drops otherSkillSlug
      expect(
        validateIntent(
          { intent: 'skill_relationship', params: { skillSlug: 'javascript', otherSkillSlug: 'unknown' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'skill_relationship',
        params: { skillSlug: 'javascript' },
      });

      // When primary skillSlug is missing or invalid -> out_of_scope
      expect(
        validateIntent(
          { intent: 'skill_relationship', params: { skillSlug: 'unknown' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'out_of_scope',
        params: {},
      });
    });

    it('validates progress_summary and out_of_scope take no params', () => {
      expect(
        validateIntent(
          { intent: 'progress_summary', params: { extra: 'param' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'progress_summary',
        params: {},
      });

      expect(
        validateIntent(
          { intent: 'out_of_scope', params: { extra: 'param' } },
          { skillSlugs, careerSlugs },
        ),
      ).toEqual({
        intent: 'out_of_scope',
        params: {},
      });
    });
  });

  describe('keywordRouter', () => {
    it('1. Example: "Why should I learn SQL?" -> explain_skill', () => {
      const res = keywordRouter('Why should I learn SQL?', catalog);
      expect(res).toEqual({
        intent: 'explain_skill',
        params: { skillSlug: 'sql' },
      });
    });

    it('2. Example: "I only have 2 months. What should I focus on?" -> time_boxed_plan (8 weeks)', () => {
      const res = keywordRouter('I only have 2 months. What should I focus on?', catalog);
      expect(res).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 8 },
      });
    });

    it('3. Example: "I already know JavaScript. Why are you recommending TypeScript?" -> skill_relationship', () => {
      const res = keywordRouter(
        'I already know JavaScript. Why are you recommending TypeScript?',
        catalog,
      );
      expect(res).toEqual({
        intent: 'skill_relationship',
        params: { skillSlug: 'javascript', otherSkillSlug: 'typescript' },
      });
    });

    it('4. Example: "What happens if I switch from Data Scientist to ML Engineer?" -> what_if', () => {
      const res = keywordRouter(
        'What happens if I switch from Data Scientist to ML Engineer?',
        catalog,
      );
      expect(res).toEqual({
        intent: 'what_if',
        params: { careerSlug: 'machine-learning-engineer' },
      });
    });

    it('5. Handles special characters in skills like C++ and Node.js', () => {
      const res1 = keywordRouter('Why should I learn C++?', catalog);
      expect(res1).toEqual({
        intent: 'explain_skill',
        params: { skillSlug: 'c-plus-plus' },
      });

      const res2 = keywordRouter('Is Node.js a prerequisite for backend?', catalog);
      expect(res2).toEqual({
        intent: 'skill_relationship',
        params: { skillSlug: 'nodejs' },
      });
    });

    it('6. Route for progress / how am i doing', () => {
      const res1 = keywordRouter('How am I doing so far?', catalog);
      expect(res1).toEqual({ intent: 'progress_summary', params: {} });

      const res2 = keywordRouter('Show my current progress summary', catalog);
      expect(res2).toEqual({ intent: 'progress_summary', params: {} });
    });

    it('7. Route for recommendations', () => {
      const res1 = keywordRouter('What should I learn next?', catalog);
      expect(res1).toEqual({ intent: 'explain_recommendation', params: {} });

      const res2 = keywordRouter('What should I focus on next for Python?', catalog);
      expect(res2).toEqual({
        intent: 'explain_recommendation',
        params: { skillSlug: 'python' },
      });
    });

    it('8. Route for week based time_boxed_plan', () => {
      const res = keywordRouter('I have 6 weeks before interviews', catalog);
      expect(res).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 6 },
      });
    });

    it('9. Route for career switch / become', () => {
      const res = keywordRouter('What if I become a Frontend Developer?', catalog);
      expect(res).toEqual({
        intent: 'what_if',
        params: { careerSlug: 'frontend-developer' },
      });
    });

    it('10. Route for unlocks between two skills', () => {
      const res = keywordRouter('Does React unlock other skills?', catalog);
      expect(res).toEqual({
        intent: 'skill_relationship',
        params: { skillSlug: 'react' },
      });
    });

    it('11. Route for unrelated query -> out_of_scope', () => {
      const res = keywordRouter('What is the weather in Hyderabad today?', catalog);
      expect(res).toEqual({ intent: 'out_of_scope', params: {} });
    });

    it('12. Route for empty message -> out_of_scope', () => {
      const res = keywordRouter('', catalog);
      expect(res).toEqual({ intent: 'out_of_scope', params: {} });
    });
  });

  describe('parseIntentJson', () => {
    it('parses raw JSON', () => {
      const json = '{"intent":"explain_skill","params":{"skillSlug":"sql"}}';
      expect(parseIntentJson(json)).toEqual({
        intent: 'explain_skill',
        params: { skillSlug: 'sql' },
      });
    });

    it('parses JSON inside ```json fence', () => {
      const fenced = '```json\n{"intent":"time_boxed_plan","params":{"weeks":8}}\n```';
      expect(parseIntentJson(fenced)).toEqual({
        intent: 'time_boxed_plan',
        params: { weeks: 8 },
      });
    });

    it('parses JSON surrounded by conversational chatter', () => {
      const chatter = 'Here is the intent:\n{"intent":"what_if","params":{"careerSlug":"ds"}}\nHope that helps!';
      expect(parseIntentJson(chatter)).toEqual({
        intent: 'what_if',
        params: { careerSlug: 'ds' },
      });
    });

    it('returns null and does not throw for invalid text', () => {
      expect(parseIntentJson('')).toBeNull();
      expect(parseIntentJson('Just some text with no json')).toBeNull();
      expect(parseIntentJson('{broken json: true')).toBeNull();
      expect(parseIntentJson(null)).toBeNull();
    });
  });
});
