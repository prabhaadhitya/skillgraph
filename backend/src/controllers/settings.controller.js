import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import { activeSettingsService } from '../services/settings.service.js';

/**
 * Factory for settings controller to support service injection in tests.
 *
 * @param {Object} [settingsService=null]
 * @returns {Object} Controller handlers
 */
export function createSettingsController(settingsService = null) {
  const getService = () => settingsService || activeSettingsService;

  return {
    getLlmSettings: asyncHandler(async (req, res) => {
      const data = await getService().getSettings(req.user.id);
      respond.ok(res, data);
    }),

    updateLlmSettings: asyncHandler(async (req, res) => {
      const payload = req.validated?.body || req.body;
      const data = await getService().updateSettings(req.user.id, payload);
      respond.ok(res, data);
    }),

    removeLlmKey: asyncHandler(async (req, res) => {
      const data = await getService().removeKey(req.user.id);
      respond.ok(res, data);
    }),

    testLlmKey: asyncHandler(async (req, res) => {
      const data = await getService().testKey(req.user.id);
      respond.ok(res, data);
    }),

    getSuggestedModels: asyncHandler(async (req, res) => {
      const data = getService().suggestedModels();
      respond.ok(res, data);
    }),
  };
}

const defaultController = createSettingsController();

export const {
  getLlmSettings,
  updateLlmSettings,
  removeLlmKey,
  testLlmKey,
  getSuggestedModels,
} = defaultController;

export default defaultController;
