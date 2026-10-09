import { LlmError } from './LlmError.js';

export { LlmError };

/**
 * Strips raw API keys and Authorization headers from error strings.
 */
function sanitizeMessage(str, apiKey) {
  if (typeof str !== 'string') return '';
  let cleaned = str;
  if (apiKey && typeof apiKey === 'string') {
    cleaned = cleaned.replaceAll(apiKey, '[REDACTED]');
  }
  return cleaned
    .replace(/bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/authorization:\s*[^\r\n,]+/gi, 'Authorization: [REDACTED]');
}

/**
 * Factory for creating an OpenRouter chat client.
 *
 * @param {object} options
 * @param {string} options.baseUrl - Base API URL (e.g. 'https://openrouter.ai/api/v1')
 * @param {typeof fetch} [options.fetchImpl=fetch] - Injectable fetch implementation
 * @returns {{ chat: Function }} Client instance with chat method
 */
export function createOpenRouterClient({ baseUrl, fetchImpl = fetch } = {}) {
  if (!baseUrl) {
    throw new Error('baseUrl is required for OpenRouter client');
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    /**
     * Sends a chat completion request to OpenRouter.
     */
    async chat({
      apiKey,
      model,
      messages,
      temperature = 0.3,
      maxTokens = 400,
      timeoutMs = 20000,
    }) {
      if (!apiKey) {
        throw new LlmError('auth', 'OpenRouter API key is required');
      }

      const controller = new AbortController();
      let isTimeout = false;
      const timer = setTimeout(() => {
        isTimeout = true;
        controller.abort();
      }, timeoutMs);

      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'SkillGraph',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (
          isTimeout ||
          controller.signal.aborted ||
          err?.name === 'AbortError' ||
          err?.name === 'TimeoutError'
        ) {
          throw new LlmError('timeout', `OpenRouter request timed out after ${timeoutMs}ms`);
        }
        const cleanErr = sanitizeMessage(err?.message || 'Network error', apiKey);
        throw new LlmError('upstream', `OpenRouter network failure: ${cleanErr}`);
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        let errBodyText = '';
        try {
          errBodyText = await response.text();
        } catch {
          // ignore stream reading error
        }
        const sanitizedErr = sanitizeMessage(errBodyText, apiKey);

        if (response.status === 401 || response.status === 403) {
          throw new LlmError('auth', `OpenRouter authentication failed (status ${response.status})`);
        }
        if (
          response.status === 404 ||
          (response.status === 400 &&
            (sanitizedErr.toLowerCase().includes('model') && sanitizedErr.toLowerCase().includes('not found')))
        ) {
          throw new LlmError('bad_model', `Model '${model}' not found on OpenRouter`);
        }
        if (response.status === 429) {
          throw new LlmError('rate_limit', 'OpenRouter rate limit exceeded (status 429)');
        }

        const snippet = sanitizedErr ? `: ${sanitizedErr.slice(0, 150)}` : '';
        throw new LlmError('upstream', `OpenRouter returned upstream error status ${response.status}${snippet}`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new LlmError('bad_response', 'Failed to parse JSON response from OpenRouter');
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new LlmError('bad_response', 'OpenRouter response missing choices[0].message.content');
      }

      return {
        content,
        model: data.model || model,
        usage: data.usage || null,
      };
    },
  };
}
