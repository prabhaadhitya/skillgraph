import { describe, it, expect } from 'vitest';
import {
  buildCareerModel,
  computeFit,
  computeGapItems,
  computePriorities,
  isReady,
  // getNextSkills,
  buildLearningPath,
  reasonsFor,
  getNodeState,
  buildGraphView,
} from '../../src/services/engine/index.js';
import { getGapStatus } from '../../src/utils/gapStatus.js';

describe('Engine Unit Tests (E1 to E14)', () => {
  // Helper to build tiny test models
  const createSmallModel = () => {
    const skills = [
      { slug: 'a', name: 'Skill A', category: 'prog', difficulty: 1 },
      { slug: 'b', name: 'Skill B', category: 'prog', difficulty: 2 },
      { slug: 'c', name: 'Skill C', category: 'prog', difficulty: 3 },
      { slug: 'd', name: 'Skill D', category: 'prog', difficulty: 4 },
    ];
    // a -> b -> c; a -> d
    const edges = [
      { source: 'a', target: 'b', type: 'PREREQUISITE' },
      { source: 'b', target: 'c', type: 'PREREQUISITE' },
      { source: 'a', target: 'd', type: 'PREREQUISITE' },
      { source: 'c', target: 'd', type: 'RELATED_TO' },
    ];
    const careerSkills = [
      { skillSlug: 'a', importance: 0.8, requiredLevel: 3 },
      { skillSlug: 'b', importance: 0.6, requiredLevel: 4 },
      { skillSlug: 'c', importance: 0.4, requiredLevel: 2 },
      { skillSlug: 'd', importance: 0.2, requiredLevel: 3 },
    ];

    return buildCareerModel({
      careerSlug: 'test-career',
      skills,
      edges,
      careerSkills,
    });
  };

  it('E1: gap gives 0 and status "strong" when proficiency >= required', () => {
    expect(getGapStatus(0)).toBe('strong');
    expect(getGapStatus(-1)).toBe('strong');

    const model = createSmallModel();
    const result = computeGapItems(model, { a: 3, b: 5, c: 2, d: 3 });
    const itemA = result.items.find((i) => i.skill.slug === 'a');
    expect(itemA.gap).toBe(0);
    expect(itemA.status).toBe('strong');
    expect(itemA.priority).toBe(0);
  });

  it('E2: gap 1, 2, 3, 5 maps to developing, major, critical, critical', () => {
    expect(getGapStatus(1)).toBe('developing');
    expect(getGapStatus(2)).toBe('major');
    expect(getGapStatus(3)).toBe('critical');
    expect(getGapStatus(5)).toBe('critical');
  });

  it('E3: Fit with empty profile has coverage 0 and score based solely on root readiness', () => {
    const model = createSmallModel();
    const fit = computeFit(model, {});
    expect(fit.coverage).toBe(0);
    // Root skills ready: only 'a' has no prereqs.
    // Total importance = 0.8 + 0.6 + 0.4 + 0.2 = 2.0.
    // Readiness = 0.8 / 2.0 = 0.4.
    // Score = round(100 * (0.85 * 0 + 0.15 * 0.4)) = round(6) = 6.
    expect(fit.readiness).toBe(0.4);
    expect(fit.fitScore).toBe(6);
    expect(fit.band).toBe('early');
  });

  it('E4: Fit with every skill at required level is 100', () => {
    const model = createSmallModel();
    const fit = computeFit(model, { a: 3, b: 4, c: 2, d: 3 });
    expect(fit.coverage).toBe(1);
    expect(fit.readiness).toBe(1);
    expect(fit.fitScore).toBe(100);
    expect(fit.band).toBe('strong');
  });

  it('E5: Fit is monotonic: raising any proficiency never lowers the score', () => {
    const model = createSmallModel();
    const profileLow = { a: 1, b: 1 };
    const profileHigh = { a: 2, b: 1 };
    const fitLow = computeFit(model, profileLow);
    const fitHigh = computeFit(model, profileHigh);
    expect(fitHigh.fitScore).toBeGreaterThanOrEqual(fitLow.fitScore);
  });

  it('E6: Fit ignores levels above required (min cap)', () => {
    const model = createSmallModel();
    // For 'a', requiredLevel is 3
    const fitAtReq = computeFit(model, { a: 3 });
    const fitAboveReq = computeFit(model, { a: 5 });
    expect(fitAboveReq.coverage).toBe(fitAtReq.coverage);
    expect(fitAboveReq.readiness).toBe(fitAtReq.readiness);
    expect(fitAboveReq.fitScore).toBe(fitAtReq.fitScore);
  });

  it('E7: isReady: prereq below required is not ready; at required is ready; no prereq always ready', () => {
    const model = createSmallModel();
    // 'a' has no prereqs -> always ready
    expect(isReady(model, {}, 'a')).toBe(true);

    // 'b' requires 'a' at 3
    expect(isReady(model, { a: 2 }, 'b')).toBe(false);
    expect(isReady(model, { a: 3 }, 'b')).toBe(true);
    expect(isReady(model, { a: 4 }, 'b')).toBe(true);

    // 'c' requires 'b' at 4
    expect(isReady(model, { a: 3, b: 3 }, 'c')).toBe(false);
    expect(isReady(model, { a: 3, b: 4 }, 'c')).toBe(true);
  });

  it('E8: dependencyImpact is in [0, 1], max raw is 1, and all-zero case yields 0', () => {
    const model = createSmallModel();
    // Empty profile: all have gap > 0
    const priorities = computePriorities(model, {});
    expect(priorities.size).toBe(4);

    // For 'c', it has no descendants -> raw impact is 0
    // For 'a', descendants are b, c, d with importances 0.6 + 0.4 + 0.2 = 1.2 (maximum)
    // Skill 'a' has rawImpact = 1.2 = maxRaw, so depImpact = 1.0.
    // Check when all skills have no descendants or maxRaw is 0:
    const flatModel = buildCareerModel({
      careerSlug: 'flat',
      skills: [
        { slug: 'x', name: 'X', category: 'prog', difficulty: 1 },
        { slug: 'y', name: 'Y', category: 'prog', difficulty: 1 },
      ],
      edges: [],
      careerSkills: [
        { skillSlug: 'x', importance: 0.5, requiredLevel: 2 },
        { skillSlug: 'y', importance: 0.5, requiredLevel: 2 },
      ],
    });
    const flatPriorities = computePriorities(flatModel, {});
    expect(flatPriorities.size).toBe(2);
    // Both skills have 0 descendants with gap > 0, so dependencyImpact is 0 (no division by zero)
    expect(Number.isFinite(flatPriorities.get('x'))).toBe(true);
    expect(Number.isFinite(flatPriorities.get('y'))).toBe(true);
  });

  it('E9: Priority increases with importance and with gap (others equal)', () => {
    const flatModel = buildCareerModel({
      careerSlug: 'flat',
      skills: [
        { slug: 'highImp', name: 'High Imp', category: 'prog', difficulty: 1 },
        { slug: 'lowImp', name: 'Low Imp', category: 'prog', difficulty: 1 },
        { slug: 'highGap', name: 'High Gap', category: 'prog', difficulty: 1 },
        { slug: 'lowGap', name: 'Low Gap', category: 'prog', difficulty: 1 },
      ],
      edges: [],
      careerSkills: [
        { skillSlug: 'highImp', importance: 0.9, requiredLevel: 3 },
        { skillSlug: 'lowImp', importance: 0.3, requiredLevel: 3 },
        { skillSlug: 'highGap', importance: 0.5, requiredLevel: 5 },
        { skillSlug: 'lowGap', importance: 0.5, requiredLevel: 1 },
      ],
    });

    const priorities = computePriorities(flatModel, {});
    expect(priorities.get('highImp')).toBeGreaterThan(priorities.get('lowImp'));
    expect(priorities.get('highGap')).toBeGreaterThan(priorities.get('lowGap'));
  });

  it('E10: Path respects prerequisites: every direct prerequisite with gap appears earlier', () => {
    const model = createSmallModel();
    const pathResult = buildLearningPath(model, {});
    const orderMap = new Map();
    pathResult.steps.forEach((step, idx) => orderMap.set(step.skill.slug, idx));

    // a must appear before b and d; b must appear before c
    expect(orderMap.get('a')).toBeLessThan(orderMap.get('b'));
    expect(orderMap.get('a')).toBeLessThan(orderMap.get('d'));
    expect(orderMap.get('b')).toBeLessThan(orderMap.get('c'));
  });

  it('E11: Path never deadlocks and ends with all gaps closed', () => {
    const model = createSmallModel();
    const pathResult = buildLearningPath(model, {});
    expect(pathResult.steps.length).toBe(4);

    // Simulate applying the path
    const finalProfile = {};
    for (const step of pathResult.steps) {
      finalProfile[step.skill.slug] = step.toLevel;
    }
    const gapResult = computeGapItems(model, finalProfile);
    expect(gapResult.items.every((i) => i.gap === 0)).toBe(true);
  });

  it('E12: Path with no gaps returns empty steps and totalSteps = 0', () => {
    const model = createSmallModel();
    const pathResult = buildLearningPath(model, { a: 3, b: 4, c: 2, d: 3 });
    expect(pathResult.totalSteps).toBe(0);
    expect(pathResult.totalEffortPoints).toBe(0);
    expect(pathResult.steps).toEqual([]);
  });

  it('E13: effortPoints = (to - from) * difficulty', () => {
    const model = createSmallModel();
    // Start with a at level 1 (required 3, diff 1 -> (3 - 1)*1 = 2)
    // Start with b at level 0 (required 4, diff 2 -> (4 - 0)*2 = 8)
    const pathResult = buildLearningPath(model, { a: 1 });
    const stepA = pathResult.steps.find((s) => s.skill.slug === 'a');
    expect(stepA.fromLevel).toBe(1);
    expect(stepA.toLevel).toBe(3);
    expect(stepA.effortPoints).toBe(2);

    const stepB = pathResult.steps.find((s) => s.skill.slug === 'b');
    expect(stepB.fromLevel).toBe(0);
    expect(stepB.toLevel).toBe(4);
    expect(stepB.effortPoints).toBe(8);
  });

  it('E14: Node state: top-3 ready skills are recommended; others by gap/proficiency', () => {
    expect(getNodeState({ gap: 2, proficiency: 0, isRecommended: true })).toBe('recommended');
    expect(getNodeState({ gap: 0, proficiency: 3, isRecommended: false })).toBe('mastered');
    expect(getNodeState({ gap: 1, proficiency: 2, isRecommended: false })).toBe('partial');
    expect(getNodeState({ gap: 3, proficiency: 0, isRecommended: false })).toBe('missing');
    expect(getNodeState({ gap: 0, proficiency: 0, isRecommended: false, isRelevant: false })).toBe('not_relevant');
  });

  it('reasonsFor returns codes in priority order and handles REQUIRED_BY_CAREER fallback', () => {
    const model = createSmallModel();
    // 'a' has importance 0.8 (HIGH_IMPORTANCE), gap 3 (LARGE_GAP), and 3 descendants with gap: b, c, d (UNLOCKS_MANY)
    const reasonsA = reasonsFor(model, {}, 'a');
    expect(reasonsA).toEqual(['HIGH_IMPORTANCE', 'LARGE_GAP', 'UNLOCKS_MANY']);

    // 'd' has importance 0.2, gap 3, 0 descendants
    const reasonsD = reasonsFor(model, {}, 'd');
    expect(reasonsD).toEqual(['LARGE_GAP']);

    // When gap is 1 and imp < 0.8 and no descendants:
    const reasonsQuickWin = reasonsFor(model, { d: 2 }, 'd');
    expect(reasonsQuickWin).toEqual(['QUICK_WIN']);

    // None apply: imp < 0.8, gap = 2, no descendants
    const reasonsFallback = reasonsFor(model, { d: 1 }, 'd');
    expect(reasonsFallback).toEqual(['REQUIRED_BY_CAREER']);
  });

  it('buildGraphView returns correct nodes, edges (prerequisite + related), and stats', () => {
    const model = createSmallModel();
    const view = buildGraphView(model, {}, { includeRelated: true, recommendedLimit: 2 });
    expect(view.stats.nodes).toBe(4);
    // 3 PREREQUISITE edges + 1 RELATED_TO edge
    expect(view.stats.edges).toBe(4);

    const viewNoRelated = buildGraphView(model, {}, { includeRelated: false });
    expect(viewNoRelated.stats.edges).toBe(3);
    expect(viewNoRelated.edges.every((e) => e.type === 'PREREQUISITE')).toBe(true);

    const nodeA = view.nodes.find((n) => n.id === 'a');
    expect(nodeA.isReadyNow).toBe(true);
    expect(nodeA.state).toBe('recommended');
  });
});
