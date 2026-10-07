/**
 * Career engine entry point.
 * Exports pure functions for career fit, gap analysis, priority calculation,
 * prerequisite-aware learning paths, and graph visualization.
 */

import { buildCareerModel, isReady, buildGraphView } from './graph.js';
import { computeFit } from './fit.js';
import { computeGapItems } from './gap.js';
import { computePriorities, getNextSkills, compareCandidates } from './priority.js';
import { buildLearningPath } from './path.js';
import { reasonsFor } from './reasons.js';
import { getNodeState } from './nodeState.js';

export {
  buildCareerModel,
  isReady,
  buildGraphView,
  computeFit,
  computeGapItems,
  computePriorities,
  getNextSkills,
  compareCandidates,
  buildLearningPath,
  reasonsFor,
  getNodeState,
};

export default {
  buildCareerModel,
  isReady,
  buildGraphView,
  computeFit,
  computeGapItems,
  computePriorities,
  getNextSkills,
  compareCandidates,
  buildLearningPath,
  reasonsFor,
  getNodeState,
};
