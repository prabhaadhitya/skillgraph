import { api } from './api.js';

/**
 * Sends a student query to the grounded AI assistant.
 *
 * @param {string} message - User query (max 500 characters)
 * @returns {Promise<{ reply: string, intent: string, degraded: boolean, keySource: string, model: string, notice: string|null, grounding: { skills: string[], careers: string[] } }>}
 */
export async function sendChatMessage(message) {
  return api.post('/ai/chat', { message });
}

/**
 * Requests a grounded explanation for why a skill is recommended.
 *
 * @param {string} skillSlug
 * @returns {Promise<Object>}
 */
export async function explainSkill(skillSlug) {
  return api.post('/ai/explain', { skillSlug });
}

/**
 * Retrieves the student's conversation history in chronological order.
 *
 * @param {number} [limit=30]
 * @returns {Promise<{ items: Array<{ id: string, role: string, content: string, intent: string, createdAt: string }> }>}
 */
export async function getChatHistory(limit = 30) {
  return api.get(`/ai/history?limit=${limit}`);
}

/**
 * Clears the student's conversation history.
 *
 * @returns {Promise<{ cleared: boolean }>}
 */
export async function clearChatHistory() {
  return api.delete('/ai/history');
}

export default {
  sendChatMessage,
  explainSkill,
  getChatHistory,
  clearChatHistory,
};
