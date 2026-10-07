import { describe, it, expect, vi } from 'vitest';

vi.mock('./api.js', async () => {
  const actual = await vi.importActual('./api.js');
  return {
    ...actual,
    USE_MOCKS: true,
  };
});

import {
  getGraph,
  getLearningPath,
  updateSkill,
  getSkillDetail,
} from './analysisService.js';

describe('analysisService (Mock Mode)', () => {
  it('getGraph returns graph nodes, edges, and stats in mock mode', async () => {
    const data = await getGraph('machine-learning-engineer', { includeRelated: false });
    expect(data).toBeDefined();
    expect(data.nodes).toBeInstanceOf(Array);
    expect(data.edges).toBeInstanceOf(Array);
    expect(data.nodes.length).toBeGreaterThan(0);

    // Verify RELATED_TO edges are filtered out when includeRelated is false
    const relatedEdges = data.edges.filter((e) => e.type === 'RELATED_TO' || e.type === 'RELATED');
    expect(relatedEdges.length).toBe(0);
  });

  it('getGraph includes related edges when includeRelated is true', async () => {
    const data = await getGraph('machine-learning-engineer', { includeRelated: true });
    expect(data).toBeDefined();
    expect(data.edges).toBeInstanceOf(Array);
  });

  it('getLearningPath returns learning path with totalSteps, totalEffortPoints, and steps', async () => {
    const data = await getLearningPath('machine-learning-engineer');
    expect(data).toBeDefined();
    expect(data.totalSteps).toBeGreaterThan(0);
    expect(data.totalEffortPoints).toBeGreaterThan(0);
    expect(data.steps).toBeInstanceOf(Array);
    expect(data.steps.length).toBeGreaterThan(0);

    const firstStep = data.steps[0];
    expect(firstStep).toHaveProperty('order');
    expect(firstStep).toHaveProperty('skill');
    expect(firstStep).toHaveProperty('fromLevel');
    expect(firstStep).toHaveProperty('toLevel');
    expect(firstStep).toHaveProperty('reasons');
  });

  it('updateSkill returns updated skill and fit scores in expected shape', async () => {
    const res = await updateSkill('statistics', 3);
    expect(res).toEqual({
      skill: {
        slug: 'statistics',
        name: 'Statistics',
      },
      previousLevel: 1,
      proficiency: 3,
      fit: {
        score: 65,
        previousScore: 61,
        band: 'developing',
      },
    });
  });

  it('getSkillDetail returns comprehensive skill info for a slug', async () => {
    const detail = await getSkillDetail('statistics');
    expect(detail).toBeDefined();
    expect(detail.skill).toHaveProperty('slug', 'statistics');
    expect(detail.skill).toHaveProperty('name', 'Statistics');
    expect(detail.prerequisites).toBeInstanceOf(Array);
    expect(detail.unlocks).toBeInstanceOf(Array);
    expect(detail.requiredFor).toBeInstanceOf(Array);
    expect(detail.you).toHaveProperty('proficiency');
  });
});
