import { describe, it, expect } from 'vitest';
import { validateSeed, findCycle } from '../../seed/validate.js';
import { loadSeedFiles } from '../../seed/loadSeedFiles.js';

function createValidBaseSeed() {
  const skills = [
    { slug: 'skill-a', name: 'Skill A', category: 'programming', difficulty: 1 },
    { slug: 'skill-b', name: 'Skill B', category: 'programming', difficulty: 2 },
    { slug: 'skill-c', name: 'Skill C', category: 'programming', difficulty: 3 },
  ];

  // Add dummy skills so career has >= 15 skills for V10
  for (let i = 1; i <= 15; i++) {
    skills.push({
      slug: `extra-skill-${i}`,
      name: `Extra Skill ${i}`,
      category: 'programming',
      difficulty: 2,
    });
  }

  const relationships = [
    { source: 'skill-a', target: 'skill-b', type: 'PREREQUISITE', strength: 1.0 },
    { source: 'skill-b', target: 'skill-c', type: 'PREREQUISITE', strength: 1.0 },
  ];

  const careers = [
    { slug: 'career-alpha', name: 'Career Alpha', category: 'software', icon: 'code' },
  ];

  const careerSkills = [
    { career: 'career-alpha', skill: 'skill-a', importance: 1.0, requiredLevel: 3 },
    { career: 'career-alpha', skill: 'skill-b', importance: 0.8, requiredLevel: 2 },
    { career: 'career-alpha', skill: 'skill-c', importance: 0.5, requiredLevel: 2 },
  ];

  for (let i = 1; i <= 15; i++) {
    careerSkills.push({
      career: 'career-alpha',
      skill: `extra-skill-${i}`,
      importance: 0.6,
      requiredLevel: 2,
    });
  }

  return { skills, relationships, careers, careerSkills };
}

describe('Seed Validator (V1 to V11)', () => {
  it('clean fixture produces zero errors and zero warnings', () => {
    const seed = createValidBaseSeed();
    const { errors, warnings } = validateSeed(seed);

    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  describe('V1: Slug uniqueness and kebab-case format', () => {
    it('detects bad kebab-case slug', () => {
      const seed = createValidBaseSeed();
      seed.skills[0].slug = 'Invalid_Slug';

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V1 slug format'))).toBe(true);
    });

    it('detects duplicate skill slug', () => {
      const seed = createValidBaseSeed();
      seed.skills.push({
        slug: 'skill-a',
        name: 'Skill A Duplicate',
        category: 'programming',
        difficulty: 1,
      });

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V1 duplicate slug'))).toBe(true);
    });

    it('detects duplicate career slug', () => {
      const seed = createValidBaseSeed();
      seed.careers.push({
        slug: 'career-alpha',
        name: 'Career Alpha Duplicate',
        category: 'software',
      });

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V1 duplicate slug'))).toBe(true);
    });
  });

  describe('V2: Referenced slugs existence', () => {
    it('detects unknown skill slug in relationships and careerSkills', () => {
      const seed = createValidBaseSeed();
      seed.relationships.push({
        source: 'non-existent-skill',
        target: 'skill-a',
        type: 'PREREQUISITE',
      });
      seed.careerSkills.push({
        career: 'career-alpha',
        skill: 'ghost-skill',
        importance: 0.5,
        requiredLevel: 2,
      });

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.includes('non-existent-skill') && e.startsWith('V2'))).toBe(true);
      expect(errors.some((e) => e.includes('ghost-skill') && e.startsWith('V2'))).toBe(true);
    });
  });

  describe('V3: Self-loops and cycles', () => {
    it('detects self-loop in prerequisites', () => {
      const seed = createValidBaseSeed();
      seed.relationships.push({
        source: 'skill-a',
        target: 'skill-a',
        type: 'PREREQUISITE',
      });

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V3 self-loop'))).toBe(true);
    });

    it('detects a 3-node cycle in prerequisites', () => {
      const seed = createValidBaseSeed();
      // skill-a -> skill-b -> skill-c -> skill-a
      seed.relationships.push({
        source: 'skill-c',
        target: 'skill-a',
        type: 'PREREQUISITE',
      });

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V3 cycle'))).toBe(true);
    });

    it('findCycle correctly returns the cycle path or null', () => {
      const cycleEdges = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'c', target: 'a' },
      ];
      expect(findCycle(cycleEdges)).toEqual(['a', 'b', 'c', 'a']);

      const acyclicEdges = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ];
      expect(findCycle(acyclicEdges)).toBeNull();
    });
  });

  describe('V4: Numerical ranges', () => {
    it('detects out-of-range difficulty, importance, requiredLevel, and strength', () => {
      const seed = createValidBaseSeed();
      seed.skills[0].difficulty = 6;
      seed.careerSkills[0].importance = 1.5;
      seed.careerSkills[1].requiredLevel = 0;
      seed.relationships[0].strength = -0.5;

      const { errors } = validateSeed(seed);
      expect(errors.filter((e) => e.startsWith('V4 range')).length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('V5: Career closure', () => {
    it('detects when prerequisite is missing from the career subgraph', () => {
      const seed = createValidBaseSeed();
      // skill-b requires skill-a, but we remove skill-a from career-alpha
      seed.careerSkills = seed.careerSkills.filter((cs) => cs.skill !== 'skill-a');

      const { errors } = validateSeed(seed);
      expect(
        errors.some(
          (e) =>
            e.startsWith('V5 closure') &&
            e.includes('skill-b') &&
            e.includes('needs prerequisite skill-a'),
        ),
      ).toBe(true);
    });
  });

  describe('V6: Prerequisite level >= 2', () => {
    it('detects when a prerequisite skill has requiredLevel < 2 in the career', () => {
      const seed = createValidBaseSeed();
      // skill-a is a prerequisite of skill-b, set requiredLevel to 1
      const csA = seed.careerSkills.find((cs) => cs.skill === 'skill-a');
      csA.requiredLevel = 1;

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V6 prerequisite level'))).toBe(true);
    });
  });

  describe('V7: Duplicate career-skills and duplicate relationships', () => {
    it('detects duplicate (career, skill) and duplicate relationship', () => {
      const seed = createValidBaseSeed();
      seed.careerSkills.push({ ...seed.careerSkills[0] });
      seed.relationships.push({ ...seed.relationships[0] });

      const { errors } = validateSeed(seed);
      expect(errors.filter((e) => e.startsWith('V7 duplicate')).length).toBe(2);
    });
  });

  describe('V8: RELATED_TO reverse order duplicate', () => {
    it('detects RELATED_TO edge defined in reverse order', () => {
      const seed = createValidBaseSeed();
      seed.relationships.push(
        { source: 'skill-a', target: 'skill-c', type: 'RELATED_TO' },
        { source: 'skill-c', target: 'skill-a', type: 'RELATED_TO' },
      );

      const { errors } = validateSeed(seed);
      expect(errors.some((e) => e.startsWith('V8 related reverse duplicate'))).toBe(true);
    });
  });

  describe('V9: Orphan skills warning', () => {
    it('warns when a skill is in no relationship and no career', () => {
      const seed = createValidBaseSeed();
      seed.skills.push({
        slug: 'orphan-skill',
        name: 'Orphan Skill',
        category: 'programming',
        difficulty: 1,
      });

      const { warnings } = validateSeed(seed);
      expect(
        warnings.some((w) => w.startsWith('V9 orphan skill') && w.includes('orphan-skill')),
      ).toBe(true);
    });
  });

  describe('V10: Career skills count and importance 1.0 warning', () => {
    it('warns if career has fewer than 15 skills', () => {
      const seed = createValidBaseSeed();
      // Keep only 3 skills for career-alpha
      seed.careerSkills = seed.careerSkills.slice(0, 3);

      const { warnings } = validateSeed(seed);
      expect(warnings.some((w) => w.startsWith('V10 career skill count'))).toBe(true);
    });

    it('warns if career has no skill with importance 1.0', () => {
      const seed = createValidBaseSeed();
      for (const cs of seed.careerSkills) {
        cs.importance = 0.8;
      }

      const { warnings } = validateSeed(seed);
      expect(warnings.some((w) => w.startsWith('V10 career importance'))).toBe(true);
    });
  });

  describe('V11: Longest chain length warning', () => {
    it('warns if longest prerequisite chain exceeds 6 edges', () => {
      const seed = createValidBaseSeed();
      // Build a chain of 7 edges: s0 -> s1 -> s2 -> s3 -> s4 -> s5 -> s6 -> s7
      const chainSkills = [];
      const chainEdges = [];
      for (let i = 0; i <= 7; i++) {
        const slug = `chain-s${i}`;
        chainSkills.push({
          slug,
          name: `Chain ${i}`,
          category: 'programming',
          difficulty: 1,
        });
        if (i > 0) {
          chainEdges.push({
            source: `chain-s${i - 1}`,
            target: `chain-s${i}`,
            type: 'PREREQUISITE',
            strength: 1.0,
          });
        }
      }

      seed.skills.push(...chainSkills);
      seed.relationships.push(...chainEdges);
      for (const cs of chainSkills) {
        seed.careerSkills.push({
          career: 'career-alpha',
          skill: cs.slug,
          importance: 0.5,
          requiredLevel: 2,
        });
      }

      const { warnings } = validateSeed(seed);
      expect(warnings.some((w) => w.startsWith('V11 chain length'))).toBe(true);
    });
  });

  describe('Real Knowledge Base Seed Data', () => {
    it('passes all V1 to V11 rules with 0 errors and 0 warnings', () => {
      const realSeed = loadSeedFiles();
      const { errors, warnings } = validateSeed(realSeed);

      expect(errors).toEqual([]);
      expect(warnings).toEqual([]);
    });
  });
});
