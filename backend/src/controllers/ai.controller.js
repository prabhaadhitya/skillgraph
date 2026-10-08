import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import { ChatMessage } from '../models/chatMessage.model.js';
import * as orchestratorService from '../services/ai/orchestrator.js';

/**
 * Factory for creating AI controller to allow dependency injection in tests.
 *
 * @param {Object} [options={}]
 * @param {Object} [options.orchestrator]
 * @param {Object} [options.chatMessageModel]
 * @returns {Object} Controller methods
 */
export function createAiController({
  orchestrator = orchestratorService,
  chatMessageModel = ChatMessage,
} = {}) {
  return {
    chat: asyncHandler(async (req, res) => {
      const payload = req.validated?.body || req.body;
      const result = await orchestrator.orchestrateChat({
        userId: req.user.id,
        message: payload.message,
      });
      respond.ok(res, result, result.meta);
    }),

    explain: asyncHandler(async (req, res) => {
      const payload = req.validated?.body || req.body;
      const result = await orchestrator.orchestrateExplain({
        userId: req.user.id,
        skillSlug: payload.skillSlug,
      });
      respond.ok(res, result, result.meta);
    }),

    getHistory: asyncHandler(async (req, res) => {
      const query = req.validated?.query || req.query;
      const limit = Number(query.limit) || 30;

      const docs = await chatMessageModel
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Return items in chronological order for conversation rendering
      const items = docs.reverse().map((d) => ({
        id: d._id ? d._id.toString() : d.id,
        role: d.role,
        content: d.content,
        intent: d.intent || null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      }));

      respond.ok(res, { items });
    }),

    clearHistory: asyncHandler(async (req, res) => {
      await chatMessageModel.deleteMany({ userId: req.user.id });
      respond.ok(res, { cleared: true });
    }),
  };
}

const defaultController = createAiController();

export const { chat, explain, getHistory, clearHistory } = defaultController;
export default defaultController;
