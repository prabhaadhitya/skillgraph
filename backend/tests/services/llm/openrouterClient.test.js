import { describe, it, expect } from 'vitest';
import { createOpenRouterClient, LlmError } from '../../../src/services/llm/openrouterClient.js';

describe('services/llm/openrouterClient', () => {
  const baseUrl = 'https://openrouter.example/api/v1';
  const testApiKey = 'sk-or-v1-testkey1234567890abcdef';
  const testModel = 'meta-llama/llama-3-8b-instruct:free';

  it('successfully returns content, model and usage on valid response', async () => {
    let capturedUrl = '';
    let capturedOptions = {};

    const fakeFetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            id: 'gen-123',
            model: testModel,
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Here is your grounded explanation.',
                },
              },
            ],
            usage: {
              prompt_tokens: 120,
              completion_tokens: 45,
              total_tokens: 165,
            },
          };
        },
      };
    };

    const client = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetch });
    const result = await client.chat({
      apiKey: testApiKey,
      model: testModel,
      messages: [{ role: 'user', content: 'What should I learn next?' }],
      temperature: 0.2,
      maxTokens: 300,
    });

    expect(capturedUrl).toBe(`${baseUrl}/chat/completions`);
    expect(capturedOptions.method).toBe('POST');
    expect(capturedOptions.headers['Authorization']).toBe(`Bearer ${testApiKey}`);
    expect(capturedOptions.headers['Content-Type']).toBe('application/json');
    expect(capturedOptions.headers['X-Title']).toBe('SkillGraph');

    const body = JSON.parse(capturedOptions.body);
    expect(body.model).toBe(testModel);
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(300);

    expect(result).toEqual({
      content: 'Here is your grounded explanation.',
      model: testModel,
      usage: {
        prompt_tokens: 120,
        completion_tokens: 45,
        total_tokens: 165,
      },
    });
  });

  it('throws LlmError with kind "auth" on 401 or 403', async () => {
    const fakeFetch401 = async () => ({
      ok: false,
      status: 401,
      async text() {
        return 'Unauthorized token';
      },
    });

    const client = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetch401 });

    try {
      await client.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect.fail('Should have thrown LlmError');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      expect(err.kind).toBe('auth');
      expect(err.message).toMatch(/401/);
    }

    const fakeFetch403 = async () => ({
      ok: false,
      status: 403,
      async text() {
        return 'Forbidden';
      },
    });
    const client403 = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetch403 });
    await expect(
      client403.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'auth' });
  });

  it('throws LlmError with kind "rate_limit" on 429', async () => {
    const fakeFetch429 = async () => ({
      ok: false,
      status: 429,
      async text() {
        return 'Rate limit exceeded';
      },
    });

    const client = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetch429 });

    await expect(
      client.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'rate_limit' });
  });

  it('throws LlmError with kind "upstream" on 500 or network error', async () => {
    const fakeFetch500 = async () => ({
      ok: false,
      status: 500,
      async text() {
        return 'Internal Server Error';
      },
    });

    const client = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetch500 });

    await expect(
      client.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'upstream' });

    // Network level error
    const fakeFetchNetwork = async () => {
      throw new Error('ECONNRESET connection broken');
    };
    const clientNetwork = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchNetwork });
    await expect(
      clientNetwork.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'upstream' });
  });

  it('throws LlmError with kind "timeout" when request times out', async () => {
    const fakeFetchHangs = (_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const client = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchHangs });

    await expect(
      client.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
        timeoutMs: 50,
      }),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('throws LlmError with kind "bad_response" on invalid JSON or missing choices', async () => {
    // Bad JSON
    const fakeFetchBadJson = async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
    });

    const clientBadJson = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchBadJson });
    await expect(
      clientBadJson.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'bad_response' });

    // Missing choices
    const fakeFetchEmptyChoices = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { choices: [] };
      },
    });
    const clientEmptyChoices = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchEmptyChoices });
    await expect(
      clientEmptyChoices.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'bad_response' });

    // Missing content string
    const fakeFetchNoContent = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: {} }] };
      },
    });
    const clientNoContent = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchNoContent });
    await expect(
      clientNoContent.chat({
        apiKey: testApiKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toMatchObject({ kind: 'bad_response' });
  });

  it('ensures API key never appears in any thrown error message', async () => {
    const sensitiveKey = 'sk-or-v1-secret-unique-key-9876543210';

    // Scenario 1: Upstream error body echoes the key
    const fakeFetchEchoesKey = async () => ({
      ok: false,
      status: 400,
      async text() {
        return `Invalid key provided: Bearer ${sensitiveKey}`;
      },
    });

    const client1 = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchEchoesKey });
    try {
      await client1.chat({
        apiKey: sensitiveKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect.fail('Expected error');
    } catch (err) {
      expect(err.message).not.toContain(sensitiveKey);
      expect(err.message).not.toMatch(/Bearer\s+sk-or/i);
    }

    // Scenario 2: Network exception message echoes the key
    const fakeFetchThrowsKey = async () => {
      throw new Error(`Failed to authenticate with Authorization: Bearer ${sensitiveKey}`);
    };

    const client2 = createOpenRouterClient({ baseUrl, fetchImpl: fakeFetchThrowsKey });
    try {
      await client2.chat({
        apiKey: sensitiveKey,
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect.fail('Expected error');
    } catch (err) {
      expect(err.message).not.toContain(sensitiveKey);
      expect(err.message).not.toMatch(/Bearer\s+sk-or/i);
    }
  });
});
