import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCareerModel,
  computeFit,
  computeGapItems,
  getNextSkills,
  buildLearningPath,
} from '../../src/services/engine/index.js';

describe('Engine Golden Fixture Tests (E11b, E11c)', () => {
  let golden;
  let skills;
  let relationships;
  let careerSkills;
  const modelsByCareer = new Map();

  beforeAll(() => {
    const fixturesDir = path.resolve(process.cwd(), '../shared/fixtures');
    const seedDir = path.resolve(process.cwd(), '../shared/seed');

    golden = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'engine_golden.json'), 'utf8'));
    skills = JSON.parse(fs.readFileSync(path.join(seedDir, 'skills.json'), 'utf8'));
    relationships = JSON.parse(fs.readFileSync(path.join(seedDir, 'relationships.json'), 'utf8'));
    careerSkills = JSON.parse(fs.readFileSync(path.join(seedDir, 'career-skills.json'), 'utf8'));

    const careers = [...new Set(careerSkills.map((cs) => cs.career))];
    for (const careerSlug of careers) {
      const cSkills = careerSkills
        .filter((cs) => cs.career === careerSlug)
        .map((cs) => ({
          skillSlug: cs.skill,
          importance: cs.importance,
          requiredLevel: cs.requiredLevel,
        }));

      const model = buildCareerModel({
        careerSlug,
        skills,
        edges: relationships,
        careerSkills: cSkills,
      });

      modelsByCareer.set(careerSlug, model);
    }
  });

  it('contains exactly 18 golden test cases', () => {
    expect(golden.cases.length).toBe(18);
  });

  it('matches all 18 golden cases for fit, summary, nextSkills, and path (E11c)', () => {
    for (const testCase of golden.cases) {
      const model = modelsByCareer.get(testCase.career);
      expect(model).toBeDefined();

      // 1. Fit score, coverage, readiness
      const fit = computeFit(model, testCase.profile);
      expect(fit.fitScore, `fitScore mismatch in ${testCase.id}`).toBe(testCase.fitScore);
      expect(fit.coverage, `coverage mismatch in ${testCase.id}`).toBeCloseTo(testCase.coverage, 4);
      expect(fit.readiness, `readiness mismatch in ${testCase.id}`).toBeCloseTo(testCase.readiness, 4);

      // 2. Summary
      const gapResult = computeGapItems(model, testCase.profile);
      expect(gapResult.summary, `summary mismatch in ${testCase.id}`).toEqual(testCase.summary);

      // 3. Next skills (slugs in order, priorities to 2 decimals)
      const nextSkills = getNextSkills(model, testCase.profile, 3);
      const simplifiedNextSkills = nextSkills.map((item) => ({
        skill: item.skill.slug,
        priority: item.score,
      }));
      expect(simplifiedNextSkills, `nextSkills mismatch in ${testCase.id}`).toEqual(testCase.nextSkills);

      // 4. Learning path (entries for skill, fromLevel, toLevel, priority 2dp, effortPoints)
      const pathResult = buildLearningPath(model, testCase.profile);
      const simplifiedPath = pathResult.steps.map((step) => ({
        skill: step.skill.slug,
        fromLevel: step.fromLevel,
        toLevel: step.toLevel,
        priority: step.priority,
        effortPoints: step.effortPoints,
      }));
      expect(simplifiedPath, `path mismatch in ${testCase.id}`).toEqual(testCase.path);
    }
  });

  it('next skill #1 equals path step 1 for every golden case with at least one gap (E11b)', () => {
    for (const testCase of golden.cases) {
      const model = modelsByCareer.get(testCase.career);
      const gapResult = computeGapItems(model, testCase.profile);
      const totalGaps = gapResult.items.filter((item) => item.gap > 0).length;

      if (totalGaps > 0) {
        const nextSkills = getNextSkills(model, testCase.profile, 3);
        const pathResult = buildLearningPath(model, testCase.profile);

        expect(nextSkills.length, `Expected at least one nextSkill in ${testCase.id}`).toBeGreaterThan(0);
        expect(pathResult.steps.length, `Expected at least one path step in ${testCase.id}`).toBeGreaterThan(0);

        const topNextSkill = nextSkills[0].skill.slug;
        const firstPathSkill = pathResult.steps[0].skill.slug;
        expect(topNextSkill, `next skill #1 must match path step 1 in ${testCase.id}`).toBe(firstPathSkill);
      }
    }
  });
});
