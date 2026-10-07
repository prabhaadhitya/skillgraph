import { describe, it, expect } from 'vitest';
import { renderTemplateAnswer } from '../../../src/services/llm/templates.js';
import { ALLOWED_INTENTS } from '../../../src/services/llm/intents.js';

describe('services/llm/templates', () => {
  it('renders all allowed intents with an empty object without throwing', () => {
    for (const intent of ALLOWED_INTENTS) {
      expect(() => {
        const text = renderTemplateAnswer(intent, {});
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
        // No markdown tables (|---|)
        expect(text).not.toContain('|---|');
      }).not.toThrow();
    }
  });

  describe('explain_skill', () => {
    it('renders with full facts and reason code mapping', () => {
      const facts = {
        career: { slug: 'machine-learning-engineer', name: 'Machine Learning Engineer' },
        skill: { slug: 'python', name: 'Python', category: 'programming' },
        you: {
          proficiency: 2,
          levelLabel: 'Intermediate',
          status: 'developing',
          requiredLevel: 4,
          importance: 0.9,
        },
        prerequisites: [
          { name: 'Programming Fundamentals', proficiency: 3, requiredLevel: 3, met: true },
          { name: 'Linear Algebra', proficiency: 1, requiredLevel: 3, met: false },
        ],
        unlocks: ['Deep Learning', 'PyTorch'],
        requiredForCareers: ['ML Engineer', 'Data Scientist'],
        priority: 0.85,
        reasons: ['HIGH_IMPORTANCE', 'UNLOCKS_MANY'],
        inPath: { order: 2, totalSteps: 8 },
      };

      const result = renderTemplateAnswer('explain_skill', facts);
      expect(result).toContain('Python');
      expect(result).toContain('Machine Learning Engineer');
      expect(result).toContain('level 2 (Intermediate)');
      expect(result).toContain('level 4 is required');
      expect(result).toContain('it is very important for this career and it unlocks many other skills');
      expect(result).toContain('Linear Algebra');
      expect(result).toContain('Deep Learning');
      expect(result).toContain('step 2 of 8');
    });
  });

  describe('explain_recommendation', () => {
    it('always contains "estimated career alignment" when score is present', () => {
      const facts = {
        career: { name: 'ML Engineer' },
        fit: { score: 65, band: 'developing' },
        nextSkills: [
          { name: 'Statistics', score: 0.88, reasons: ['HIGH_IMPORTANCE', 'LARGE_GAP'], strategy: 'ml' },
        ],
      };

      const result = renderTemplateAnswer('explain_recommendation', facts);
      expect(result).toContain('estimated career alignment');
      expect(result).toContain('65%');
      expect(result).toContain('Statistics');
      expect(result).toContain('it is very important for this career and there is a big gap to close');
    });
  });

  describe('time_boxed_plan', () => {
    it('renders time boxed plan steps and later items', () => {
      const facts = {
        career: { name: 'Data Scientist' },
        weeks: 8,
        capacityPoints: 48,
        steps: [
          { order: 1, name: 'SQL', fromLevel: 0, toLevel: 3, effortPoints: 6 },
          { order: 2, name: 'Pandas', fromLevel: 1, toLevel: 3, effortPoints: 8 },
        ],
        later: ['Machine Learning', 'Big Data'],
        totalSteps: 7,
      };

      const result = renderTemplateAnswer('time_boxed_plan', facts);
      expect(result).toContain('8-week plan');
      expect(result).toContain('Data Scientist');
      expect(result).toContain('1. SQL (level 0 to 3)');
      expect(result).toContain('2. Pandas (level 1 to 3)');
      expect(result).toContain('Machine Learning');
    });
  });

  describe('what_if', () => {
    it('renders career switch comparison with estimated career alignment', () => {
      const facts = {
        current: { career: { name: 'Data Analyst' }, fitScore: 70, pathSteps: 4 },
        alternative: { career: { name: 'ML Engineer' }, fitScore: 55, pathSteps: 9 },
        delta: -15,
        newlyRequired: [{ name: 'Deep Learning', requiredLevel: 3 }],
        topPriority: ['Linear Algebra'],
      };

      const result = renderTemplateAnswer('what_if', facts);
      expect(result).toContain('estimated career alignment is 70% for Data Analyst vs 55% for ML Engineer');
      expect(result).toContain('-15% change');
      expect(result).toContain('Deep Learning');
      expect(result).toContain('Linear Algebra');
    });
  });

  describe('skill_relationship', () => {
    it('renders prerequisite and unlocks relationships', () => {
      const prereqFacts = {
        skill: { name: 'Python' },
        other: { name: 'Machine Learning Fundamentals' },
        relation: 'prerequisite',
        pathBetween: ['Python', 'NumPy', 'Machine Learning Fundamentals'],
        youKnow: { skill: 'Proficient', other: 'None' },
      };

      const result = renderTemplateAnswer('skill_relationship', prereqFacts);
      expect(result).toContain('Python is a prerequisite required for Machine Learning Fundamentals');
      expect(result).toContain('Python -> NumPy -> Machine Learning Fundamentals');
      expect(result).toContain('Proficient');
    });

    it('renders none relation when no connection exists', () => {
      const noneFacts = {
        skill: { name: 'HTML' },
        other: { name: 'Linear Algebra' },
        relation: 'none',
      };

      const result = renderTemplateAnswer('skill_relationship', noneFacts);
      expect(result).toContain('no direct prerequisite or unlock relationship');
    });
  });

  describe('progress_summary', () => {
    it('renders progress summary with estimated career alignment and score delta', () => {
      const facts = {
        career: { name: 'ML Engineer' },
        fit: { score: 74, previousScore: 68, delta: 6 },
        summary: { strong: 8, developing: 4, missing: 3, total: 15 },
        recentChanges: [{ name: 'SQL', previousLevel: 1, currentLevel: 3 }],
        nextSkills: ['Statistics', 'PyTorch'],
      };

      const result = renderTemplateAnswer('progress_summary', facts);
      expect(result).toContain('estimated career alignment for ML Engineer is 74% (+6% change)');
      expect(result).toContain('8 strong, 4 developing, and 3 missing (15 total)');
      expect(result).toContain('SQL (1 -> 3)');
      expect(result).toContain('Statistics, PyTorch');
    });
  });

  describe('out_of_scope', () => {
    it('renders polite redirect for out_of_scope', () => {
      const result = renderTemplateAnswer('out_of_scope', {});
      expect(result).toContain('I can only help with questions about your skills');
    });
  });
});
