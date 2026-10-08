import { retrieveExplainSkill } from './explainSkill.js';
import { retrieveExplainRecommendation } from './explainRecommendation.js';
import { retrieveTimeBoxedPlan } from './timeBoxedPlan.js';
import { retrieveWhatIf } from './whatIf.js';
import { retrieveSkillRelationship } from './skillRelationship.js';
import { retrieveProgressSummary } from './progressSummary.js';

import * as careerModelService from '../../careerModel.service.js';
import * as profileService from '../../profile.service.js';
import engine from '../../engine/index.js';
import * as alignmentService from '../../alignment.service.js';
import * as progressService from '../../userSkills.service.js';
import * as userService from '../../user.service.js';
import * as catalogService from '../../catalog.service.js';

/**
 * Registry of intent-specific facts retrievers.
 */
export const RETRIEVERS = {
  explain_skill: retrieveExplainSkill,
  explain_recommendation: retrieveExplainRecommendation,
  time_boxed_plan: retrieveTimeBoxedPlan,
  what_if: retrieveWhatIf,
  skill_relationship: retrieveSkillRelationship,
  progress_summary: retrieveProgressSummary,
};

/**
 * Returns default production dependencies wired to the real services.
 *
 * @returns {Object}
 */
export function getDefaultDeps() {
  return {
    careerModelService,
    profileService,
    engine,
    alignmentService,
    progressService,
    userService,
    catalogService,
  };
}

/**
 * Dispatcher to execute a facts retriever by intent name.
 *
 * @param {string} intent - Intent identifier
 * @param {Object} [deps] - Optional injected dependencies; defaults to real services
 * @param {string} userId - Caller user ID
 * @param {Object} [params={}] - Intent parameters
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function executeRetriever(intent, deps, userId, params = {}) {
  const retriever = RETRIEVERS[intent];
  if (!retriever) {
    return {
      facts: {},
      grounding: { skills: [], careers: [] },
    };
  }

  const resolvedDeps = deps || getDefaultDeps();
  return retriever(resolvedDeps, userId, params);
}

export {
  retrieveExplainSkill,
  retrieveExplainRecommendation,
  retrieveTimeBoxedPlan,
  retrieveWhatIf,
  retrieveSkillRelationship,
  retrieveProgressSummary,
};

export default {
  RETRIEVERS,
  getDefaultDeps,
  executeRetriever,
  retrieveExplainSkill,
  retrieveExplainRecommendation,
  retrieveTimeBoxedPlan,
  retrieveWhatIf,
  retrieveSkillRelationship,
  retrieveProgressSummary,
};
