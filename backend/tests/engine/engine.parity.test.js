import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCareerModel,
  computeFit,
  computeGapItems,
  buildLearningPath,
} from '../../src/services/engine/index.js';

describe('Engine Parity Tests (100 profiles x 5 careers = 500 cases)', () => {
  let dataset;
  let skills;
  let relationships;
  let careerSkills;
  const modelsByCareer = new Map();

  beforeAll(() => {
    const fixturePath = path.resolve(process.cwd(), '../shared/fixtures/engine_parity_100x5.json');
    const seedDir = path.resolve(process.cwd(), '../shared/seed');

    dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    skills = JSON.parse(fs.readFileSync(path.join(seedDir, 'skills.json'), 'utf8'));
    relationships = JSON.parse(fs.readFileSync(path.join(seedDir, 'relationships.json'), 'utf8'));
    careerSkills = JSON.parse(fs.readFileSync(path.join(seedDir, 'career-skills.json'), 'utf8'));

    const distinctCareers = [...new Set(careerSkills.map((cs) => cs.career))];
    for (const careerSlug of distinctCareers) {
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

  it('contains exactly 500 test cases across 100 profiles and 5 careers', () => {
    expect(dataset.cases.length).toBe(500);
    expect(dataset.meta.profilesCount).toBe(100);
    expect(dataset.meta.careersCount).toBe(5);
  });

  it('verifies all 500 cases match fit, summary, and first 5 path steps', () => {
    for (const testCase of dataset.cases) {
      const model = modelsByCareer.get(testCase.career);
      expect(model).toBeDefined();

      // 1. Fit metrics
      const fit = computeFit(model, testCase.profile);
      expect(fit.fitScore, `fitScore mismatch in ${testCase.id}`).toBe(testCase.fit.fitScore);
      expect(fit.coverage, `coverage mismatch in ${testCase.id}`).toBeCloseTo(testCase.fit.coverage, 4);
      expect(fit.readiness, `readiness mismatch in ${testCase.id}`).toBeCloseTo(testCase.fit.readiness, 4);
      expect(fit.band, `band mismatch in ${testCase.id}`).toBe(testCase.fit.band);

      // 2. Summary
      const gapResult = computeGapItems(model, testCase.profile);
      expect(gapResult.summary, `summary mismatch in ${testCase.id}`).toEqual(testCase.summary);

      // 3. First 5 path steps
      const pathResult = buildLearningPath(model, testCase.profile);
      const first5 = pathResult.steps.slice(0, 5).map((step) => ({
        skill: step.skill.slug,
        fromLevel: step.fromLevel,
        toLevel: step.toLevel,
        priority: step.priority,
        effortPoints: step.effortPoints,
      }));
      expect(first5, `pathFirst5 mismatch in ${testCase.id}`).toEqual(testCase.pathFirst5);
    }
  });
});
