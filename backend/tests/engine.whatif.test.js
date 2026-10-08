import { describe, it, expect } from 'vitest';
import { buildCareerModel } from '../src/services/engine/graph.js';
import { computeWhatIf } from '../src/services/engine/whatIf.js';

describe('Engine What-If Analysis (E15)', () => {
  const createTestModels = () => {
    // Model A: Software Developer
    const skillsA = [
      { slug: 'prog-basics', name: 'Programming Basics', category: 'prog', difficulty: 1 },
      { slug: 'git', name: 'Git', category: 'tools', difficulty: 2 },
      { slug: 'js', name: 'JavaScript', category: 'prog', difficulty: 2 },
      { slug: 'react', name: 'React', category: 'web', difficulty: 3 },
    ];
    const edgesA = [
      { source: 'prog-basics', target: 'js', type: 'PREREQUISITE' },
      { source: 'js', target: 'react', type: 'PREREQUISITE' },
    ];
    const careerSkillsA = [
      { skillSlug: 'prog-basics', importance: 0.8, requiredLevel: 4 },
      { skillSlug: 'git', importance: 0.6, requiredLevel: 3 },
      { skillSlug: 'js', importance: 0.9, requiredLevel: 4 },
      { skillSlug: 'react', importance: 0.7, requiredLevel: 3 },
    ];
    const modelA = buildCareerModel({
      careerSlug: 'software-dev',
      skills: skillsA,
      edges: edgesA,
      careerSkills: careerSkillsA,
    });

    // Model B: Data Scientist (shares prog-basics & git, has python & stats instead of js & react)
    const skillsB = [
      { slug: 'prog-basics', name: 'Programming Basics', category: 'prog', difficulty: 1 },
      { slug: 'git', name: 'Git', category: 'tools', difficulty: 2 },
      { slug: 'python', name: 'Python', category: 'prog', difficulty: 2 },
      { slug: 'stats', name: 'Statistics', category: 'math', difficulty: 3 },
    ];
    const edgesB = [
      { source: 'prog-basics', target: 'python', type: 'PREREQUISITE' },
    ];
    const careerSkillsB = [
      { skillSlug: 'prog-basics', importance: 0.8, requiredLevel: 4 },
      { skillSlug: 'git', importance: 0.5, requiredLevel: 2 },
      { skillSlug: 'python', importance: 1.0, requiredLevel: 4 },
      { skillSlug: 'stats', importance: 0.7, requiredLevel: 3 },
    ];
    const modelB = buildCareerModel({
      careerSlug: 'data-scientist',
      skills: skillsB,
      edges: edgesB,
      careerSkills: careerSkillsB,
    });

    return { modelA, modelB };
  };

  it('E15: what-if leaves inputs deep-equal (no mutations)', () => {
    const { modelA, modelB } = createTestModels();
    const profile = { 'prog-basics': 4, git: 2 };

    // Deep clone state representations before calling what-if
    const profileBefore = JSON.parse(JSON.stringify(profile));
    const modelAEdgesBefore = JSON.parse(JSON.stringify(modelA.edges));
    const modelBEdgesBefore = JSON.parse(JSON.stringify(modelB.edges));
    const modelASkillsListBefore = JSON.parse(JSON.stringify(modelA.careerSkillsList));
    const modelBSkillsListBefore = JSON.parse(JSON.stringify(modelB.careerSkillsList));

    const result = computeWhatIf(modelA, profile, modelB);

    // Profile must be unchanged
    expect(profile).toEqual(profileBefore);

    // Models must be unchanged
    expect(JSON.parse(JSON.stringify(modelA.edges))).toEqual(modelAEdgesBefore);
    expect(JSON.parse(JSON.stringify(modelB.edges))).toEqual(modelBEdgesBefore);
    expect(JSON.parse(JSON.stringify(modelA.careerSkillsList))).toEqual(modelASkillsListBefore);
    expect(JSON.parse(JSON.stringify(modelB.careerSkillsList))).toEqual(modelBSkillsListBefore);

    expect(result).toBeDefined();
    expect(result.current).toBeDefined();
    expect(result.projected).toBeDefined();
  });

  it('computes correct fit scores, delta, and bands', () => {
    const { modelA, modelB } = createTestModels();
    const profile = { 'prog-basics': 4, git: 2, js: 4, react: 3 };

    const result = computeWhatIf(modelA, profile, modelB);

    // In modelA, student has completed all required skills
    expect(result.current.score).toBeGreaterThan(90);
    expect(result.current.band).toBe('strong');

    // In modelB, student only has prog-basics and git (missing python and stats)
    expect(result.projected.score).toBeLessThan(result.current.score);
    expect(result.delta).toBe(result.projected.score - result.current.score);
  });

  it('identifies newlyRequired skill slugs in alternative career', () => {
    const { modelA, modelB } = createTestModels();
    const profile = { 'prog-basics': 2 };

    const result = computeWhatIf(modelA, profile, modelB);

    // Model B requires 'python' and 'stats', which Model A does not require
    expect(result.newlyRequired).toEqual(['python', 'stats']);
  });

  it('returns up to 3 topPriorities for the alternative career', () => {
    const { modelA, modelB } = createTestModels();
    const profile = { 'prog-basics': 4, git: 2 };

    const result = computeWhatIf(modelA, profile, modelB);

    expect(Array.isArray(result.topPriorities)).toBe(true);
    expect(result.topPriorities.length).toBeLessThanOrEqual(3);
    for (const priority of result.topPriorities) {
      expect(priority.slug).toBeDefined();
      expect(typeof priority.score).toBe('number');
      expect(priority.isReadyNow).toBe(true);
    }
  });
});
