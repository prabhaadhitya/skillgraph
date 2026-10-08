import { describe, it, expect } from 'vitest';
import { buildCareerModel } from '../src/services/engine/graph.js';
import { compareCareers } from '../src/services/engine/compare.js';
import { planWithinBudget } from '../src/services/engine/budget.js';

describe('Engine Career Comparison & Budget Planning (E16)', () => {
  const createComparisonModels = () => {
    // Model A: Frontend Engineer (4 skills: html, css, js, react)
    const skillsA = [
      { slug: 'html', name: 'HTML', category: 'web', difficulty: 1 },
      { slug: 'css', name: 'CSS', category: 'web', difficulty: 1 },
      { slug: 'js', name: 'JavaScript', category: 'prog', difficulty: 2 },
      { slug: 'react', name: 'React', category: 'web', difficulty: 3 },
    ];
    const careerSkillsA = [
      { skillSlug: 'html', importance: 0.8, requiredLevel: 4 },
      { skillSlug: 'css', importance: 0.8, requiredLevel: 4 },
      { skillSlug: 'js', importance: 0.9, requiredLevel: 4 },
      { skillSlug: 'react', importance: 0.9, requiredLevel: 4 },
    ];
    const modelA = buildCareerModel({
      careerSlug: 'frontend-eng',
      skills: skillsA,
      edges: [],
      careerSkills: careerSkillsA,
    });

    // Model B: Full Stack Engineer (5 skills: js, react, node, sql, docker)
    // Common: js, react (2 skills)
    // Only A: html, css (2 skills)
    // Only B: node, sql, docker (3 skills)
    const skillsB = [
      { slug: 'js', name: 'JavaScript', category: 'prog', difficulty: 2 },
      { slug: 'react', name: 'React', category: 'web', difficulty: 3 },
      { slug: 'node', name: 'Node.js', category: 'backend', difficulty: 3 },
      { slug: 'sql', name: 'SQL', category: 'db', difficulty: 2 },
      { slug: 'docker', name: 'Docker', category: 'devops', difficulty: 3 },
    ];
    const careerSkillsB = [
      { skillSlug: 'js', importance: 0.8, requiredLevel: 3 },
      { skillSlug: 'react', importance: 0.7, requiredLevel: 3 },
      { skillSlug: 'node', importance: 0.9, requiredLevel: 4 },
      { skillSlug: 'sql', importance: 0.8, requiredLevel: 3 },
      { skillSlug: 'docker', importance: 0.5, requiredLevel: 2 },
    ];
    const modelB = buildCareerModel({
      careerSlug: 'fullstack-eng',
      skills: skillsB,
      edges: [],
      careerSkills: careerSkillsB,
    });

    return { modelA, modelB };
  };

  describe('compareCareers (E16)', () => {
    it('E16: satisfies common + onlyA = career A skills and common + onlyB = career B skills', () => {
      const { modelA, modelB } = createComparisonModels();
      const result = compareCareers(modelA, modelB);

      const totalSkillsA = modelA.careerSkillsList.length; // 4
      const totalSkillsB = modelB.careerSkillsList.length; // 5

      // Sum of lengths matches exactly
      expect(result.common.length + result.onlyA.length).toBe(totalSkillsA);
      expect(result.common.length + result.onlyB.length).toBe(totalSkillsB);

      // Verify set partition properties
      const slugsCommon = new Set(result.common.map((s) => s.slug));
      const slugsOnlyA = new Set(result.onlyA.map((s) => s.slug));
      const slugsOnlyB = new Set(result.onlyB.map((s) => s.slug));

      // No intersection between common and onlyA
      for (const s of slugsOnlyA) {
        expect(slugsCommon.has(s)).toBe(false);
      }
      // No intersection between common and onlyB
      for (const s of slugsOnlyB) {
        expect(slugsCommon.has(s)).toBe(false);
      }

      // Union of common and onlyA equals set of all A skills
      const allASlugs = new Set(modelA.careerSkillsList.map((cs) => cs.skillSlug));
      const unionA = new Set([...slugsCommon, ...slugsOnlyA]);
      expect(unionA).toEqual(allASlugs);

      // Union of common and onlyB equals set of all B skills
      const allBSlugs = new Set(modelB.careerSkillsList.map((cs) => cs.skillSlug));
      const unionB = new Set([...slugsCommon, ...slugsOnlyB]);
      expect(unionB).toEqual(allBSlugs);
    });

    it('preserves importance and requiredLevel on each side', () => {
      const { modelA, modelB } = createComparisonModels();
      const result = compareCareers(modelA, modelB);

      // Common item 'js'
      const jsCommon = result.common.find((c) => c.slug === 'js');
      expect(jsCommon).toBeDefined();
      expect(jsCommon.importanceA).toBe(0.9);
      expect(jsCommon.importanceB).toBe(0.8);
      expect(jsCommon.requiredLevelA).toBe(4);
      expect(jsCommon.requiredLevelB).toBe(3);
      expect(jsCommon.a.importance).toBe(0.9);
      expect(jsCommon.b.importance).toBe(0.8);

      // onlyA item 'html'
      const htmlOnly = result.onlyA.find((s) => s.slug === 'html');
      expect(htmlOnly).toBeDefined();
      expect(htmlOnly.importance).toBe(0.8);
      expect(htmlOnly.requiredLevel).toBe(4);

      // onlyB item 'node'
      const nodeOnly = result.onlyB.find((s) => s.slug === 'node');
      expect(nodeOnly).toBeDefined();
      expect(nodeOnly.importance).toBe(0.9);
      expect(nodeOnly.requiredLevel).toBe(4);
    });
  });

  describe('planWithinBudget', () => {
    const sampleSteps = [
      { order: 1, skill: { slug: 'step-1' }, effortPoints: 4 },
      { order: 2, skill: { slug: 'step-2' }, effortPoints: 8 },
      { order: 3, skill: { slug: 'step-3' }, effortPoints: 6 },
      { order: 4, skill: { slug: 'step-4' }, effortPoints: 10 },
    ];

    it('truncates steps in path order when effort budget is reached', () => {
      // 2 weeks * 6 points/week = 12 effort points budget
      // Step 1 (4) + Step 2 (8) = 12 totalEffort points -> fits exactly
      // Step 3 (6) -> would exceed 12 -> truncated
      const result = planWithinBudget(sampleSteps, 2, 6);

      expect(result.budget).toBe(12);
      expect(result.totalEffort).toBe(12);
      expect(result.steps.length).toBe(2);
      expect(result.steps.map((s) => s.skill.slug)).toEqual(['step-1', 'step-2']);
      expect(result.truncated).toBe(true);
    });

    it('returns all steps without truncation when budget is sufficient', () => {
      // Total sample effort: 4 + 8 + 6 + 10 = 28
      // 5 weeks * 6 points = 30 budget
      const result = planWithinBudget(sampleSteps, 5, 6);

      expect(result.budget).toBe(30);
      expect(result.totalEffort).toBe(28);
      expect(result.steps.length).toBe(4);
      expect(result.truncated).toBe(false);
    });

    it('handles empty path or zero budget gracefully', () => {
      const emptyResult = planWithinBudget([], 4);
      expect(emptyResult.steps).toEqual([]);
      expect(emptyResult.totalEffort).toBe(0);
      expect(emptyResult.truncated).toBe(false);

      const zeroBudgetResult = planWithinBudget(sampleSteps, 0);
      expect(zeroBudgetResult.steps).toEqual([]);
      expect(zeroBudgetResult.totalEffort).toBe(0);
      expect(zeroBudgetResult.truncated).toBe(true);
    });

    it('accepts path as an object containing steps array', () => {
      const pathObj = {
        totalSteps: 4,
        totalEffortPoints: 28,
        steps: sampleSteps,
      };
      const result = planWithinBudget(pathObj, 3, 6); // Budget = 18. Steps: 4 + 8 + 6 = 18
      expect(result.steps.length).toBe(3);
      expect(result.totalEffort).toBe(18);
      expect(result.truncated).toBe(true);
    });
  });
});
