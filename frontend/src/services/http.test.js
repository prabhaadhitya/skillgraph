import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendRequest, http, ApiError, navigationAdapter } from './http.js';

describe('http.js — global error handling and request wrapper', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/app/dashboard?tab=skills');
    vi.spyOn(navigationAdapter, 'redirect').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    window.history.pushState({}, '', '/');
  });

  it('unwraps success envelopes correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        success: true,
        data: [{ id: 's-1', name: 'Python' }],
      }),
    });

    const data = await http.get('skills');
    expect(data).toEqual([{ id: 's-1', name: 'Python' }]);
  });

  it('returns data and meta when returnMeta is true', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        success: true,
        data: [{ id: 's-1', name: 'Python' }],
        meta: { total: 1 },
      }),
    });

    const result = await sendRequest('skills', { method: 'GET' }, true);
    expect(result).toEqual({
      data: [{ id: 's-1', name: 'Python' }],
      meta: { total: 1 },
    });
  });

  it('handles 401: dispatches auth:unauthorized, emits toast, and redirects to /login?next=', async () => {
    vi.useFakeTimers();

    const unauthorizedListener = vi.fn();
    const toastListener = vi.fn();
    window.addEventListener('auth:unauthorized', unauthorizedListener);
    window.addEventListener('app:toast', toastListener);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Token expired',
        },
      }),
    });

    let errorThrown = null;
    try {
      await http.get('analysis/career-fit');
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeInstanceOf(ApiError);
    expect(errorThrown.status).toBe(401);
    expect(errorThrown.code).toBe('UNAUTHENTICATED');

    // auth:unauthorized must be fired to clear context state
    expect(unauthorizedListener).toHaveBeenCalledTimes(1);

    // Toast "Please log in again" must be emitted
    expect(toastListener).toHaveBeenCalledTimes(1);
    expect(toastListener.mock.calls[0][0].detail).toEqual({
      type: 'error',
      message: 'Please log in again',
    });

    // Advance timer to trigger navigation
    vi.advanceTimersByTime(100);
    expect(navigationAdapter.redirect).toHaveBeenCalledWith(
      '/login?next=%2Fapp%2Fdashboard%3Ftab%3Dskills',
    );

    window.removeEventListener('auth:unauthorized', unauthorizedListener);
    window.removeEventListener('app:toast', toastListener);
    vi.useRealTimers();
  });

  it('handles 429: emits toast "Slow down a little and try again in a minute."', async () => {
    const toastListener = vi.fn();
    window.addEventListener('app:toast', toastListener);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
      }),
    });

    let errorThrown = null;
    try {
      await http.get('analysis/career-fit');
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeInstanceOf(ApiError);
    expect(errorThrown.status).toBe(429);
    expect(toastListener).toHaveBeenCalledTimes(1);
    expect(toastListener.mock.calls[0][0].detail).toEqual({
      type: 'error',
      message: 'Slow down a little and try again in a minute.',
    });

    window.removeEventListener('app:toast', toastListener);
  });

  it('handles network failure: throws ApiError with code NETWORK_ERROR', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    let errorThrown = null;
    try {
      await http.get('skills');
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeInstanceOf(ApiError);
    expect(errorThrown.status).toBe(0);
    expect(errorThrown.code).toBe('NETWORK_ERROR');
    expect(errorThrown.message).toMatch(/Network error/i);
  });
});
