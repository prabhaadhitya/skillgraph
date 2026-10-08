import { User } from '../models/user.model.js';
import { Career } from '../models/career.model.js';
import { AlignmentSnapshot } from '../models/alignmentSnapshot.model.js';
import { getCareerModel } from './careerModel.service.js';
import { getProfileMap } from './profile.service.js';
import {
  computeFit,
  computeGapItems,
  buildLearningPath,
  buildGraphView,
  getNextSkills,
  compareCareers,
} from './engine/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Resolve target career slug from request query or user's target career.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} [requestedCareerSlug]
 * @returns {Promise<string>} Career slug
 */
export async function resolveCareerSlug(userId, requestedCareerSlug) {
  if (requestedCareerSlug && typeof requestedCareerSlug === 'string' && requestedCareerSlug.trim()) {
    return requestedCareerSlug.trim();
  }

  const user = await User.findById(userId).populate('targetCareerId');
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.targetCareerId?.slug) {
    return user.targetCareerId.slug;
  }

  if (user.targetCareerId) {
    const career = await Career.findById(user.targetCareerId);
    if (career?.slug) {
      return career.slug;
    }
  }

  throw new ApiError(422, 'RULE_VIOLATION', 'No career specified and user has no target career set');
}

/**
 * Skill-gap analysis.
 *
 * @param {string} userId
 * @param {string} [requestedCareerSlug]
 * @returns {Promise<Object>}
 */
export async function getSkillGapAnalysis(userId, requestedCareerSlug) {
  const careerSlug = await resolveCareerSlug(userId, requestedCareerSlug);
  const { career, model } = await getCareerModel(careerSlug);
  const profile = await getProfileMap(userId);

  const { summary, items } = computeGapItems(model, profile);

  return {
    career: {
      slug: career.slug,
      name: career.name,
    },
    summary,
    items,
  };
}

/**
 * Career-fit analysis.
 *
 * @param {string} userId
 * @param {string} [requestedCareerSlug]
 * @returns {Promise<Object>}
 */
export async function getCareerFitAnalysis(userId, requestedCareerSlug) {
  const careerSlug = await resolveCareerSlug(userId, requestedCareerSlug);
  const { career, model } = await getCareerModel(careerSlug);
  const profile = await getProfileMap(userId);

  const fit = computeFit(model, profile);

  return {
    career: {
      slug: career.slug,
      name: career.name,
    },
    label: 'Estimated career alignment',
    fitScore: fit.fitScore,
    band: fit.band,
    breakdown: {
      coverage: fit.coverage,
      prerequisiteReadiness: fit.readiness,
    },
    weights: {
      coverage: 0.85,
      prerequisiteReadiness: 0.15,
    },
  };
}

/**
 * Learning-path analysis.
 *
 * @param {string} userId
 * @param {string} [requestedCareerSlug]
 * @returns {Promise<Object>}
 */
export async function getLearningPathAnalysis(userId, requestedCareerSlug) {
  const careerSlug = await resolveCareerSlug(userId, requestedCareerSlug);
  const { career, model } = await getCareerModel(careerSlug);
  const profile = await getProfileMap(userId);

  const path = buildLearningPath(model, profile);

  return {
    career: {
      slug: career.slug,
      name: career.name,
    },
    totalSteps: path.totalSteps,
    totalEffortPoints: path.totalEffortPoints,
    steps: path.steps,
  };
}

/**
 * Graph visualization analysis.
 *
 * @param {string} userId
 * @param {string} [requestedCareerSlug]
 * @param {Object} [options={}]
 * @param {boolean} [options.related=false]
 * @returns {Promise<Object>}
 */
export async function getGraphAnalysis(userId, requestedCareerSlug, { related = false } = {}) {
  const careerSlug = await resolveCareerSlug(userId, requestedCareerSlug);
  const { career, model } = await getCareerModel(careerSlug);
  const profile = await getProfileMap(userId);

  const graph = buildGraphView(model, profile, { includeRelated: related });

  return {
    career: {
      slug: career.slug,
      name: career.name,
    },
    nodes: graph.nodes,
    edges: graph.edges,
    stats: graph.stats,
  };
}

/**
 * Dashboard aggregation endpoint.
 *
 * @param {string} userId
 * @param {string} [requestedCareerSlug]
 * @returns {Promise<Object>}
 */
export async function getDashboardAnalysis(userId, requestedCareerSlug) {
  const careerSlug = await resolveCareerSlug(userId, requestedCareerSlug);
  const { career, model } = await getCareerModel(careerSlug);
  const profile = await getProfileMap(userId);
  const user = await User.findById(userId);

  const fit = computeFit(model, profile);
  const { summary, items } = computeGapItems(model, profile);

  // Look up alignment snapshots to determine previousScore & delta
  const snapshots = await AlignmentSnapshot.find({
    userId,
    careerId: career._id,
  })
    .sort({ createdAt: -1 })
    .limit(5);

  let previousScore = null;
  if (snapshots.length > 0) {
    if (snapshots[0].fitScore === fit.fitScore) {
      previousScore = snapshots[1] ? snapshots[1].fitScore : null;
    } else {
      previousScore = snapshots[0].fitScore;
    }
  }

  const delta = previousScore !== null ? fit.fitScore - previousScore : null;

  // Next skills recommendation
  let nextSkills = [];
  let strategy = 'rule';

  try {
    const recommendationService = await import('./recommendation.service.js').catch(() => null);
    if (recommendationService && typeof recommendationService.getNextSkills === 'function') {
      const res = await recommendationService.getNextSkills(userId, careerSlug, { limit: 3, strategy: 'auto' });
      nextSkills = res.items || res;
      strategy = res.strategy || 'auto';
    } else {
      nextSkills = getNextSkills(model, profile, 3).map((item) => ({
        skill: item.skill,
        score: item.score,
        reasons: item.reasons,
      }));
      strategy = 'rule';
    }
  } catch {
    nextSkills = getNextSkills(model, profile, 3).map((item) => ({
      skill: item.skill,
      score: item.score,
      reasons: item.reasons,
    }));
    strategy = 'rule';
  }

  // Top 5 gaps
  const topGaps = items
    .filter((it) => it.gap > 0)
    .slice(0, 5)
    .map((it) => ({
      skill: {
        slug: it.skill.slug,
        name: it.skill.name,
      },
      gap: it.gap,
      status: it.status,
    }));

  const updatedAt = snapshots[0]?.createdAt
    ? new Date(snapshots[0].createdAt).toISOString()
    : new Date().toISOString();

  return {
    user: {
      name: user?.name || 'Student',
    },
    career: {
      slug: career.slug,
      name: career.name,
    },
    fit: {
      score: fit.fitScore,
      previousScore,
      delta,
      band: fit.band,
    },
    summary,
    nextSkills,
    strategy,
    topGaps,
    updatedAt,
  };
}

/**
 * What-If analysis comparing current career against an alternative target career.
 * Never mutates stored data.
 *
 * @param {string} userId
 * @param {string} alternativeCareerSlug
 * @returns {Promise<Object>}
 */
export async function computeWhatIfAnalysis(userId, alternativeCareerSlug) {
  if (!alternativeCareerSlug) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Alternative career slug is required');
  }

  const currentCareerSlug = await resolveCareerSlug(userId);
  const { career: currentCareer, model: currentModel } = await getCareerModel(currentCareerSlug);
  const { career: altCareer, model: altModel } = await getCareerModel(alternativeCareerSlug);
  const profile = await getProfileMap(userId);

  const fitCurrent = computeFit(currentModel, profile);
  const pathCurrent = buildLearningPath(currentModel, profile);
  const nextCurrent = getNextSkills(currentModel, profile, 5);

  const fitAlt = computeFit(altModel, profile);
  const pathAlt = buildLearningPath(altModel, profile);
  const nextAlt = getNextSkills(altModel, profile, 5);

  const delta = fitAlt.fitScore - fitCurrent.fitScore;

  const currentSlugs = currentModel.careerSlugs;
  const altSlugs = altModel.careerSlugs;

  const newlyRequired = [];
  for (const cs of altModel.careerSkillsList) {
    if (!currentSlugs.has(cs.skillSlug)) {
      const s = altModel.skills.get(cs.skillSlug);
      newlyRequired.push({
        slug: cs.skillSlug,
        name: s?.name || cs.skillSlug,
        requiredLevel: cs.requiredLevel,
      });
    }
  }

  const noLongerRequired = [];
  for (const cs of currentModel.careerSkillsList) {
    if (!altSlugs.has(cs.skillSlug)) {
      const s = currentModel.skills.get(cs.skillSlug);
      noLongerRequired.push({
        slug: cs.skillSlug,
        name: s?.name || cs.skillSlug,
        requiredLevel: cs.requiredLevel,
      });
    }
  }

  return {
    current: {
      career: {
        slug: currentCareer.slug,
        name: currentCareer.name,
      },
      fitScore: fitCurrent.fitScore,
      pathSteps: pathCurrent.totalSteps,
      topPriority: nextCurrent.map((n) => ({
        slug: n.skill.slug,
        name: n.skill.name,
      })),
    },
    alternative: {
      career: {
        slug: altCareer.slug,
        name: altCareer.name,
      },
      fitScore: fitAlt.fitScore,
      pathSteps: pathAlt.totalSteps,
      topPriority: nextAlt.map((n) => ({
        slug: n.skill.slug,
        name: n.skill.name,
      })),
    },
    delta,
    newlyRequired,
    noLongerRequired,
  };
}

/**
 * Career comparison analysis (A vs B).
 *
 * @param {string} userId
 * @param {string} slugA
 * @param {string} slugB
 * @returns {Promise<Object>}
 */
export async function compareCareersAnalysis(userId, slugA, slugB) {
  if (!slugA || !slugB) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Both career slugs "a" and "b" are required');
  }

  const { career: careerA, model: modelA } = await getCareerModel(slugA);
  const { career: careerB, model: modelB } = await getCareerModel(slugB);
  const profile = await getProfileMap(userId);

  const fitA = computeFit(modelA, profile);
  const pathA = buildLearningPath(modelA, profile);
  const gapsA = computeGapItems(modelA, profile);

  const fitB = computeFit(modelB, profile);
  const pathB = buildLearningPath(modelB, profile);
  const gapsB = computeGapItems(modelB, profile);

  const { onlyA, common, onlyB } = compareCareers(modelA, modelB);

  const commonItems = common.map((c) => ({
    skill: {
      slug: c.slug,
      name: c.skill?.name || c.slug,
    },
    a: c.a,
    b: c.b,
  }));

  const uniqueToAItems = onlyA.map((o) => ({
    skill: {
      slug: o.slug,
      name: o.skill?.name || o.slug,
    },
    importance: o.importance,
    requiredLevel: o.requiredLevel,
  }));

  const uniqueToBItems = onlyB.map((o) => ({
    skill: {
      slug: o.slug,
      name: o.skill?.name || o.slug,
    },
    importance: o.importance,
    requiredLevel: o.requiredLevel,
  }));

  return {
    a: {
      career: {
        slug: careerA.slug,
        name: careerA.name,
      },
      fitScore: fitA.fitScore,
      pathSteps: pathA.totalSteps,
      effortPoints: pathA.totalEffortPoints,
      missingCount: gapsA.summary.missing,
    },
    b: {
      career: {
        slug: careerB.slug,
        name: careerB.name,
      },
      fitScore: fitB.fitScore,
      pathSteps: pathB.totalSteps,
      effortPoints: pathB.totalEffortPoints,
      missingCount: gapsB.summary.missing,
    },
    common: commonItems,
    uniqueToA: uniqueToAItems,
    uniqueToB: uniqueToBItems,
  };
}

export default {
  resolveCareerSlug,
  getSkillGapAnalysis,
  getCareerFitAnalysis,
  getLearningPathAnalysis,
  getGraphAnalysis,
  getDashboardAnalysis,
  computeWhatIfAnalysis,
  compareCareersAnalysis,
};
