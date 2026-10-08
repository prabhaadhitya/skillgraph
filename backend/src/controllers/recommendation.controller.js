import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import * as defaultRecommendationService from '../services/recommendation.service.js';

/**
 * Factory for creating recommendation controller to support dependency injection in tests.
 *
 * @param {Object} [service=defaultRecommendationService]
 * @returns {Object} Controller methods
 */
export function createRecommendationController(service = defaultRecommendationService) {
  return {
    getNextSkills: asyncHandler(async (req, res) => {
      const query = req.validated?.query || req.query;
      const result = await service.getNextSkills(req.user.id, query.career, {
        limit: query.limit !== undefined ? Number(query.limit) : 3,
        strategy: query.strategy || 'auto',
      });
      respond.ok(res, result);
    }),
  };
}

const defaultController = createRecommendationController();

export const { getNextSkills } = defaultController;
export default defaultController;
