import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCareerModel,
  computeFit,
  buildLearningPath,
  computeGapItems,
} from '../../src/services/engine/index.js';

describe('Engine Property Tests (5 careers × 20 random profiles)', () => {
  let skills;
  let relationships;
  let careerSkills;
  const modelsByCareer = new Map();
  const careerSlugs = [];

  // Seeded random number generator (Mulberry32) - no external dependency
  function createRng(seed = 42) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  beforeAll(() => {
    const seedDir = path.resolve(process.cwd(), '../shared/seed');
    skills = JSON.parse(fs.readFileSync(path.join(seedDir, 'skills.json'), 'utf8'));
    relationships = JSON.parse(fs.readFileSync(path.join(seedDir, 'relationships.json'), 'utf8'));
    careerSkills = JSON.parse(fs.readFileSync(path.join(seedDir, 'career-skills.json'), 'utf8'));

    const distinctCareers = [...new Set(careerSkills.map((cs) => cs.career))];
    careerSlugs.push(...distinctCareers);

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

  it('runs property tests over all 5 careers and 20 random profiles each', () => {
    expect(careerSlugs.length).toBe(5);
    const rng = createRng(20261008);

    for (const careerSlug of careerSlugs) {
      const model = modelsByCareer.get(careerSlug);

      for (let run = 0; run < 20; run++) {
        // Generate random profile
        const profile = {};
        for (const cs of model.careerSkillsList) {
          // 40% chance 0 (missing), 60% chance 1..5
          const roll = rng();
          if (roll >= 0.4) {
            profile[cs.skillSlug] = Math.floor(rng() * 5) + 1;
          }
        }

        const profileSnapshot = JSON.stringify(profile);

        // 1. Check immutability: building learning path must not mutate input profile
        const pathResult = buildLearningPath(model, profile);
        expect(JSON.stringify(profile), `Profile was mutated for ${careerSlug} run ${run}`).toBe(
          profileSnapshot
        );

        // 2. Check no deadlock and valid path structure
        expect(Array.isArray(pathResult.steps)).toBe(true);
        expect(pathResult.totalSteps).toBe(pathResult.steps.length);

        // 3. Check prerequisite ordering:
        // Every step comes AFTER all of its prerequisites that had a gap
        const stepOrderMap = new Map();
        pathResult.steps.forEach((step, idx) => {
          stepOrderMap.set(step.skill.slug, idx);
        });

        for (const step of pathResult.steps) {
          const slug = step.skill.slug;
          const directPrereqs = model.directPrereqs.get(slug) || [];
          const stepIndex = stepOrderMap.get(slug);

          for (const prereqSlug of directPrereqs) {
            const prereqCs = model.careerSkillMap.get(prereqSlug);
            const initialPrereqLevel = profile[prereqSlug] ?? 0;
            const hadGap = (prereqCs?.requiredLevel ?? 0) - initialPrereqLevel > 0;

            if (hadGap) {
              expect(
                stepOrderMap.has(prereqSlug),
                `Prereq ${prereqSlug} had a gap but is not in path for ${slug}`
              ).toBe(true);
              const prereqIndex = stepOrderMap.get(prereqSlug);
              expect(
                prereqIndex,
                `Prereq ${prereqSlug} must appear before dependent ${slug} (career: ${careerSlug})`
              ).toBeLessThan(stepIndex);
            }
          }
        }

        // 4. After applying the path, all gaps must be closed
        const simulatedProfile = { ...profile };
        for (const step of pathResult.steps) {
          simulatedProfile[step.skill.slug] = step.toLevel;
        }
        const gapResult = computeGapItems(model, simulatedProfile);
        const remainingGaps = gapResult.items.filter((item) => item.gap > 0);
        expect(
          remainingGaps.length,
          `Expected all gaps closed after path for ${careerSlug} run ${run}`
        ).toBe(0);

        // 5. Monotonicity: raising any proficiency never lowers the fit score
        const initialFit = computeFit(model, profile);
        for (const cs of model.careerSkillsList) {
          const currentProf = profile[cs.skillSlug] ?? 0;
          if (currentProf < 5) {
            const bumpedProfile = { ...profile, [cs.skillSlug]: currentProf + 1 };
            const bumpedFit = computeFit(model, bumpedProfile);
            expect(
              bumpedFit.fitScore,
              `Raising ${cs.skillSlug} from ${currentProf} to ${currentProf + 1} lowered fit score in ${careerSlug}`
            ).toBeGreaterThanOrEqual(initialFit.fitScore);
          }
        }
      }
    }
  });
});
