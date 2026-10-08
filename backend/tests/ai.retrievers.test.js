import { describe, it, expect, vi } from 'vitest';
import engine from '../src/services/engine/index.js';
import {
  retrieveExplainSkill,
  retrieveExplainRecommendation,
  retrieveTimeBoxedPlan,
  retrieveWhatIf,
  retrieveSkillRelationship,
  retrieveProgressSummary,
  executeRetriever,
} from '../src/services/ai/retrievers/index.js';

describe('services/ai/retrievers', () => {
  // 1. Build a tiny graph with engine.buildCareerModel
  const modelMLE = engine.buildCareerModel({
    careerSlug: 'ml-engineer',
    skills: [
      { slug: 'python', name: 'Python', category: 'programming', difficulty: 2 },
      { slug: 'numpy', name: 'NumPy', category: 'data-analytics', difficulty: 2 },
      { slug: 'ml', name: 'Machine Learning', category: 'machine-learning', difficulty: 3 },
      { slug: 'stats', name: 'Statistics', category: 'data-analytics', difficulty: 3 },
    ],
    edges: [
      { source: 'python', target: 'numpy', type: 'PREREQUISITE' },
      { source: 'numpy', target: 'ml', type: 'PREREQUISITE' },
      { source: 'stats', target: 'ml', type: 'PREREQUISITE' },
      { source: 'python', target: 'stats', type: 'RELATED_TO' },
    ],
    careerSkills: [
      { skillSlug: 'python', importance: 0.9, requiredLevel: 3 },
      { skillSlug: 'numpy', importance: 0.8, requiredLevel: 3 },
      { skillSlug: 'ml', importance: 0.9, requiredLevel: 4 },
      { skillSlug: 'stats', importance: 0.7, requiredLevel: 3 },
    ],
  });

  const modelDA = engine.buildCareerModel({
    careerSlug: 'data-analyst',
    skills: [
      { slug: 'python', name: 'Python', category: 'programming', difficulty: 2 },
      { slug: 'stats', name: 'Statistics', category: 'data-analytics', difficulty: 3 },
      { slug: 'sql', name: 'SQL', category: 'database', difficulty: 2 },
    ],
    edges: [],
    careerSkills: [
      { skillSlug: 'python', importance: 0.7, requiredLevel: 2 },
      { skillSlug: 'stats', importance: 0.95, requiredLevel: 4 },
      { skillSlug: 'sql', importance: 0.9, requiredLevel: 3 },
    ],
  });

  const careerModels = {
    'ml-engineer': {
      career: { slug: 'ml-engineer', name: 'Machine Learning Engineer' },
      model: modelMLE,
    },
    'data-analyst': {
      career: { slug: 'data-analyst', name: 'Data Analyst' },
      model: modelDA,
    },
  };

  const userProfiles = {
    'user-alice': {
      python: 3,
      numpy: 2,
    },
    'user-bob': {
      stats: 3,
      sql: 2,
    },
  };

  const userTargetCareers = {
    'user-alice': 'ml-engineer',
    'user-bob': 'data-analyst',
  };

  const userProgressData = {
    'user-alice': {
      history: [
        {
          skill: { slug: 'python', name: 'Python' },
          previousLevel: 1,
          currentLevel: 3,
        },
      ],
      alignment: [
        { at: '2026-10-08T10:00:00Z', fitScore: 65, careerSlug: 'ml-engineer' },
        { at: '2026-10-01T10:00:00Z', fitScore: 50, careerSlug: 'ml-engineer' },
      ],
    },
    'user-bob': {
      history: [
        {
          skill: { slug: 'sql', name: 'SQL' },
          previousLevel: 0,
          currentLevel: 2,
        },
      ],
      alignment: [
        { at: '2026-10-08T10:00:00Z', fitScore: 70, careerSlug: 'data-analyst' },
      ],
    },
  };

  const fakeDeps = {
    careerModelService: {
      getCareerModel: vi.fn(async (slug) => {
        if (!careerModels[slug]) return null;
        return careerModels[slug];
      }),
    },
    profileService: {
      getProfileMap: vi.fn(async (userId) => userProfiles[userId] || {}),
      getTargetCareer: vi.fn(async (userId) => userTargetCareers[userId] || null),
    },
    progressService: {
      getProgress: vi.fn(async (userId) => userProgressData[userId] || { history: [], alignment: [] }),
    },
    engine,
  };

  describe('L2: Unknown Slug Handling', () => {
    it('returns needsClarification on unknown skill slug without throwing', async () => {
      const res = await retrieveExplainSkill(fakeDeps, 'user-alice', {
        skillSlug: 'unknown-quantum-crypto',
      });
      expect(res).toEqual({ needsClarification: true });
    });

    it('returns needsClarification on unknown career slug in whatIf without throwing', async () => {
      const res = await retrieveWhatIf(fakeDeps, 'user-alice', {
        careerSlug: 'astronaut',
      });
      expect(res).toEqual({ needsClarification: true });
    });

    it('returns needsClarification on missing required params without throwing', async () => {
      const res1 = await retrieveExplainSkill(fakeDeps, 'user-alice', {});
      expect(res1).toEqual({ needsClarification: true });

      const res2 = await retrieveWhatIf(fakeDeps, 'user-alice', {});
      expect(res2).toEqual({ needsClarification: true });

      const res3 = await retrieveSkillRelationship(fakeDeps, 'user-alice', {
        skillSlug: 'flying-cars',
      });
      expect(res3).toEqual({ needsClarification: true });
    });
  });

  describe('L5: Isolation (Only Caller Data Appears)', () => {
    it('facts contain only the calling user’s data and nothing from other users', async () => {
      // Alice calls explain_skill for python
      const aliceRes = await retrieveExplainSkill(fakeDeps, 'user-alice', {
        skillSlug: 'python',
      });
      expect(aliceRes.needsClarification).toBeFalsy();
      expect(aliceRes.facts.you.proficiency).toBe(3); // Alice has python 3

      // Stringify alice's facts and assert Bob's distinct skill "sql" is NOT present
      const aliceJson = JSON.stringify(aliceRes.facts);
      expect(aliceJson).not.toContain('"sql"');
      expect(aliceJson).not.toContain('SQL');

      // Bob calls progress_summary
      const bobRes = await retrieveProgressSummary(fakeDeps, 'user-bob', {});
      expect(bobRes.needsClarification).toBeFalsy();
      expect(bobRes.facts.career.slug).toBe('data-analyst');
      expect(bobRes.facts.recentChanges[0].name).toBe('SQL');

      // Bob's facts must not contain Alice's progress change for python
      const bobJson = JSON.stringify(bobRes.facts);
      expect(bobJson).not.toContain('Python (1 -> 3)');
      expect(bobJson).not.toContain('"ml-engineer"');
    });
  });

  describe('Retriever 1: explainSkill', () => {
    it('retrieves skill status, prerequisites, unlocks, and learning path position', async () => {
      const res = await retrieveExplainSkill(fakeDeps, 'user-alice', {
        skillSlug: 'python',
      });

      expect(res.facts).toBeDefined();
      expect(res.facts.skill.name).toBe('Python');
      expect(res.facts.career.slug).toBe('ml-engineer');
      expect(res.facts.you.proficiency).toBe(3);
      expect(res.facts.you.levelLabel).toBe('Intermediate');
      expect(res.facts.you.status).toBe('strong'); // gap is 0 (req 3, prof 3)
      expect(res.facts.unlocks).toContain('NumPy');
      expect(res.facts.reasons).toBeInstanceOf(Array);

      expect(res.grounding.skills).toContain('python');
      expect(res.grounding.skills).toContain('numpy');
      expect(res.grounding.careers).toContain('ml-engineer');
    });
  });

  describe('Retriever 2: explainRecommendation', () => {
    it('retrieves estimated career alignment and next recommended skills', async () => {
      const res = await retrieveExplainRecommendation(fakeDeps, 'user-alice', {});

      expect(res.facts).toBeDefined();
      expect(res.facts.career.slug).toBe('ml-engineer');
      expect(typeof res.facts.fit.score).toBe('number');
      expect(res.facts.nextSkills).toBeInstanceOf(Array);
      expect(res.facts.nextSkills.length).toBeGreaterThan(0);

      const firstNext = res.facts.nextSkills[0];
      expect(firstNext.slug).toBeDefined();
      expect(firstNext.strategy).toBe('rule');
      expect(firstNext.reasons).toBeInstanceOf(Array);

      expect(res.grounding.careers).toContain('ml-engineer');
      expect(res.grounding.skills.length).toBeGreaterThan(0);
    });
  });

  describe('Retriever 3: timeBoxedPlan', () => {
    it('builds learning steps within effort points budget and lists later steps', async () => {
      const res = await retrieveTimeBoxedPlan(fakeDeps, 'user-alice', { weeks: 4 });

      expect(res.facts).toBeDefined();
      expect(res.facts.career.slug).toBe('ml-engineer');
      expect(res.facts.weeks).toBe(4);
      expect(res.facts.capacityPoints).toBe(24); // 4 * 6
      expect(res.facts.steps).toBeInstanceOf(Array);
      expect(res.facts.later).toBeInstanceOf(Array);
      expect(res.facts.totalSteps).toBeGreaterThanOrEqual(res.facts.steps.length);

      expect(res.grounding.careers).toContain('ml-engineer');
    });
  });

  describe('Retriever 4: whatIf', () => {
    it('evaluates alignment delta and newly required skills for an alternative career', async () => {
      const res = await retrieveWhatIf(fakeDeps, 'user-alice', {
        careerSlug: 'data-analyst',
      });

      expect(res.facts).toBeDefined();
      expect(res.facts.current.career.slug).toBe('ml-engineer');
      expect(res.facts.alternative.career.slug).toBe('data-analyst');
      expect(typeof res.facts.delta).toBe('number');

      // Data Analyst requires SQL which is not in ML Engineer
      const newSkillSlugs = res.facts.newlyRequired.map((s) => s.slug);
      expect(newSkillSlugs).toContain('sql');

      expect(res.grounding.careers).toContain('ml-engineer');
      expect(res.grounding.careers).toContain('data-analyst');
      expect(res.grounding.skills).toContain('sql');
    });
  });

  describe('Retriever 5: skillRelationship', () => {
    it('determines prerequisite relationship and path between skills', async () => {
      // Python -> NumPy -> ML
      const res = await retrieveSkillRelationship(fakeDeps, 'user-alice', {
        skillSlug: 'python',
        otherSkillSlug: 'numpy',
      });

      expect(res.facts).toBeDefined();
      expect(res.facts.relation).toBe('prerequisite');
      expect(res.facts.pathBetween).toEqual(['Python', 'NumPy']);
      expect(res.facts.youKnow.skill).toBe('Intermediate'); // Python is 3
      expect(res.facts.youKnow.other).toBe('Basic'); // NumPy is 2

      expect(res.grounding.skills).toContain('python');
      expect(res.grounding.skills).toContain('numpy');
    });

    it('identifies related skills connection', async () => {
      // Python <-> Statistics is RELATED_TO
      const res = await retrieveSkillRelationship(fakeDeps, 'user-alice', {
        skillSlug: 'python',
        otherSkillSlug: 'stats',
      });

      expect(res.facts.relation).toBe('related');
    });
  });

  describe('Retriever 6: progressSummary', () => {
    it('gathers fit delta, mastery counts, recent history, and next skills', async () => {
      const res = await retrieveProgressSummary(fakeDeps, 'user-alice', {});

      expect(res.facts).toBeDefined();
      expect(res.facts.career.slug).toBe('ml-engineer');
      expect(res.facts.fit.previousScore).toBe(50);
      expect(res.facts.fit.delta).toBe(res.facts.fit.score - 50);

      expect(res.facts.summary.total).toBe(4);
      expect(res.facts.summary.strong).toBeGreaterThanOrEqual(1); // Python is level 3 / req 3

      expect(res.facts.recentChanges).toBeInstanceOf(Array);
      expect(res.facts.recentChanges[0].name).toBe('Python');
      expect(res.facts.recentChanges[0].currentLevel).toBe(3);

      expect(res.facts.nextSkills).toBeInstanceOf(Array);
      expect(res.grounding.careers).toContain('ml-engineer');
    });
  });

  describe('Dispatcher: executeRetriever', () => {
    it('dispatches intent to appropriate retriever', async () => {
      const res = await executeRetriever(
        'explain_skill',
        fakeDeps,
        'user-alice',
        { skillSlug: 'python' },
      );
      expect(res.facts?.skill?.name).toBe('Python');

      const unknownRes = await executeRetriever(
        'non_existent_intent',
        fakeDeps,
        'user-alice',
        {},
      );
      expect(unknownRes).toEqual({ facts: {}, grounding: { skills: [], careers: [] } });
    });
  });
});
