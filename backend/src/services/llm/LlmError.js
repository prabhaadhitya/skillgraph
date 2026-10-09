/**
 * Error thrown by LLM services and clients.
 * Kinds: 'timeout' | 'auth' | 'rate_limit' | 'upstream' | 'bad_response' | 'bad_model'
 */
export class LlmError extends Error {
  /**
   * @param {'timeout' | 'auth' | 'rate_limit' | 'upstream' | 'bad_response' | 'bad_model'} kind - Categorized error type
   * @param {string} message - Sanitized error message (must never contain secrets)
   * @param {object} [details] - Optional context without secrets
   */
  constructor(kind, message, details = {}) {
    // Extra safety guarantee: never allow secrets or Authorization in error message
    const cleanMessage = String(message)
      .replace(/bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/sk-[A-Za-z0-9-_]+/gi, 'sk-[REDACTED]')
      .replace(/authorization:\s*[^\r\n,]+/gi, 'Authorization: [REDACTED]');

    super(cleanMessage);
    this.name = 'LlmError';
    this.kind = kind;
    this.details = details;
  }
}
