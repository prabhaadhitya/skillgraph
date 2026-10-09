import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCareerModel,
  computeFit,
  computeGapItems,
  buildLearningPath,
} from '../src/services/engine/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createRng(seed = 42) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateParityDataset(outputPath) {
  const seedDir = path.resolve(__dirname, '../../shared/seed');
  const fixturesDir = path.resolve(__dirname, '../../shared/fixtures');

  const skills = JSON.parse(fs.readFileSync(path.join(seedDir, 'skills.json'), 'utf8'));
  const relationships = JSON.parse(fs.readFileSync(path.join(seedDir, 'relationships.json'), 'utf8'));
  const careerSkills = JSON.parse(fs.readFileSync(path.join(seedDir, 'career-skills.json'), 'utf8'));

  const distinctCareers = [...new Set(careerSkills.map((cs) => cs.career))].sort();
  const modelsByCareer = new Map();

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

  const rng = createRng(20261009);
  const profiles = [];

  // Profile 0: completely empty profile
  profiles.push({});

  // Profiles 1 to 99: random variation of skill proficiencies
  for (let i = 1; i < 100; i++) {
    const profile = {};
    // Vary density of skills: some students have few skills (early), some intermediate, some advanced
    const density = 0.2 + (i / 100) * 0.7; // 0.2 to 0.9 probability of having a skill
    for (const skill of skills) {
      if (rng() < density) {
        profile[skill.slug] = Math.floor(rng() * 5) + 1;
      }
    }
    profiles.push(profile);
  }

  const cases = [];

  for (let profileIdx = 0; profileIdx < profiles.length; profileIdx++) {
    const profile = profiles[profileIdx];

    for (const careerSlug of distinctCareers) {
      const model = modelsByCareer.get(careerSlug);

      const fit = computeFit(model, profile);
      const gapResult = computeGapItems(model, profile);
      const pathResult = buildLearningPath(model, profile);

      const pathFirst5 = pathResult.steps.slice(0, 5).map((step) => ({
        skill: step.skill.slug,
        fromLevel: step.fromLevel,
        toLevel: step.toLevel,
        priority: step.priority,
        effortPoints: step.effortPoints,
      }));

      cases.push({
        id: `parity_p${profileIdx}_${careerSlug}`,
        profileIndex: profileIdx,
        career: careerSlug,
        profile,
        fit: {
          fitScore: fit.fitScore,
          coverage: fit.coverage,
          readiness: fit.readiness,
          band: fit.band,
        },
        summary: gapResult.summary,
        pathFirst5,
      });
    }
  }

  const dataset = {
    meta: {
      generator: 'backend/seed/generateParityData.js',
      description: 'Engine parity dataset: 100 random profiles x 5 careers (500 test cases)',
      profilesCount: profiles.length,
      careersCount: distinctCareers.length,
      totalCases: cases.length,
      generatedAt: '2026-10-09T00:00:00.000Z',
    },
    cases,
  };

  const targetPath = outputPath || path.join(fixturesDir, 'engine_parity_100x5.json');
  fs.writeFileSync(targetPath, JSON.stringify(dataset, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Generated ${cases.length} parity cases at ${targetPath}`);
  return dataset;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateParityDataset();
}
