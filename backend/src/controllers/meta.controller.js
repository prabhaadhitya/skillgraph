import {
  LEVELS,
  CATEGORIES,
  RELATIONSHIP_TYPES,
  GAP_STATUSES,
  NODE_STATES,
} from '../config/constants.js';
import { Skill } from '../models/skill.model.js';
import { Career } from '../models/career.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';

/**
 * Public metadata endpoint.
 * GET /api/meta
 */
export const getMeta = asyncHandler(async (req, res) => {
  const [skillsCount, careersCount] = await Promise.all([
    Skill.countDocuments(),
    Career.countDocuments(),
  ]);

  respond.ok(res, {
    levels: LEVELS,
    categories: CATEGORIES,
    relationshipTypes: RELATIONSHIP_TYPES,
    gapStatuses: GAP_STATUSES,
    nodeStates: NODE_STATES,
    counts: {
      skills: skillsCount,
      careers: careersCount,
    },
  });
});

export default {
  getMeta,
};
