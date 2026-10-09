import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCareerModel,
  computeFit,
  buildLearningPath,
  computeGapItems,
  getNextSkills,
} from '../../src/services/engine/index.js';

describe('Engine Property Tests (E5, E10, E11, E11b)', () => {
  let skills;
  let relationships;
  let careerSkills;
  const modelsByCareer = new Map();
  const careerSlugs = [];

  // Seeded random number generator (Mulberry32) - deterministic
  function createRng(seed = 42) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateRandomProfile(rng, skillsList, minDensity = 0.2, maxDensity = 0.8) {
    const profile = {};
    const density = minDensity + rng() * (maxDensity - minDensity);
    for (const s of skillsList) {
      if (rng() < density) {
        profile[s.slug || s.skillSlug] = Math.floor(rng() * 5) + 1;
      }
    }
    return profile;
  }

  beforeAll(() => {
    const seedDir = path.resolve(process.cwd(), '../shared/seed');
    skills = JSON.parse(fs.readFileSync(path.join(seedDir, 'skills.json'), 'utf8'));
    relationships = JSON.parse(fs.readFileSync(path.join(seedDir, 'relationships.json'), 'utf8'));
    careerSkills = JSON.parse(fs.readFileSync(path.join(seedDir, 'career-skills.json'), 'utf8'));

    const distinctCareers = [...new Set(careerSkills.map((cs) => cs.career))].sort();
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

  it('E5: Fit is monotonic: raising any proficiency never lowers the fit (200 random profiles)', () => {
    const rng = createRng(20261010);
    // 200 random profiles evaluated against career models (40 per career x 5 careers)
    let totalChecks = 0;

    for (const careerSlug of careerSlugs) {
      const model = modelsByCareer.get(careerSlug);

      for (let run = 0; run < 40; run++) {
        const profile = generateRandomProfile(rng, model.careerSkillsList, 0.1, 0.9);
        const initialFit = computeFit(model, profile);

        // For each skill in the career, test raising proficiency from level to level + 1
        for (const cs of model.careerSkillsList) {
          const currentProf = profile[cs.skillSlug] ?? 0;
          if (currentProf < 5) {
            const bumpedProfile = { ...profile, [cs.skillSlug]: currentProf + 1 };
            const bumpedFit = computeFit(model, bumpedProfile);
            expect(
              bumpedFit.fitScore,
              `Raising ${cs.skillSlug} from ${currentProf} to ${currentProf + 1} lowered fitScore in ${careerSlug}`
            ).toBeGreaterThanOrEqual(initialFit.fitScore);
            totalChecks++;
          }
        }
      }
    }

    expect(totalChecks).toBeGreaterThanOrEqual(200);
  });

  it('E10: Path respects prerequisites (5 careers x 20 random profiles)', () => {
    const rng = createRng(20261011);

    for (const careerSlug of careerSlugs) {
      const model = modelsByCareer.get(careerSlug);

      for (let run = 0; run < 20; run++) {
        const profile = generateRandomProfile(rng, model.careerSkillsList, 0.2, 0.8);
        const pathResult = buildLearningPath(model, profile);

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
      }
    }
  });

  it('E11: Path never deadlocks and ends with all gaps closed (5 careers x 20 random profiles)', () => {
    const rng = createRng(20261012);

    for (const careerSlug of careerSlugs) {
      const model = modelsByCareer.get(careerSlug);

      for (let run = 0; run < 20; run++) {
        const profile = generateRandomProfile(rng, model.careerSkillsList, 0.2, 0.8);
        const profileBefore = JSON.stringify(profile);

        // Building path does not mutate input
        const pathResult = buildLearningPath(model, profile);
        expect(JSON.stringify(profile)).toBe(profileBefore);

        expect(Array.isArray(pathResult.steps)).toBe(true);
        expect(pathResult.totalSteps).toBe(pathResult.steps.length);

        // Simulate applying all path steps
        const simulatedProfile = { ...profile };
        for (const step of pathResult.steps) {
          simulatedProfile[step.skill.slug] = step.toLevel;
        }

        const gapResult = computeGapItems(model, simulatedProfile);
        const remainingGaps = gapResult.items.filter((item) => item.gap > 0);
        expect(
          remainingGaps.length,
          `Expected 0 open gaps after applying path for ${careerSlug} run ${run}`
        ).toBe(0);
      }
    }
  });

  it('E11b: next skill #1 equals path step 1 whenever gaps exist (5 careers x 20 random profiles)', () => {
    const rng = createRng(20261013);

    for (const careerSlug of careerSlugs) {
      const model = modelsByCareer.get(careerSlug);

      for (let run = 0; run < 20; run++) {
        const profile = generateRandomProfile(rng, model.careerSkillsList, 0.2, 0.8);
        const gapResult = computeGapItems(model, profile);
        const hasGaps = gapResult.items.some((item) => item.gap > 0);

        if (hasGaps) {
          const nextSkills = getNextSkills(model, profile, 1);
          const pathResult = buildLearningPath(model, profile);

          expect(nextSkills.length).toBeGreaterThan(0);
          expect(pathResult.steps.length).toBeGreaterThan(0);
          expect(
            nextSkills[0].skill.slug,
            `Next skill #1 must match path step 1 for ${careerSlug} run ${run}`
          ).toBe(pathResult.steps[0].skill.slug);
        }
      }
    }
  });
});
