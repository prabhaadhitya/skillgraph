/**
 * SkillGraph HTTP Service
 * Shared fetch client with envelope unwrapping, status normalization, and global error handling.
 *
 * Global Error Rules:
 * - 401: Clears auth state, redirects to /login?next=<current path>, displays toast "Please log in again".
 * - 429: Displays toast "Slow down a little and try again in a minute."
 * - Network Error: Throws ApiError(0, 'NETWORK_ERROR', ...) that pages display using ErrorState with RETRY.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/**
 * Custom error class representing SkillGraph API errors.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code (0 for network failure)
   * @param {string} code - Error code (e.g., 'VALIDATION_ERROR', 'UNAUTHENTICATED', 'NETWORK_ERROR')
   * @param {string} message - Human-readable error message
   * @param {Array<Object>} [details=[]] - Field-level error details
   */
  constructor(status, code, message, details = []) {
    super(message || 'An error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'INTERNAL_ERROR';
    this.details = Array.isArray(details) ? details : [];
  }
}

/**
 * Navigation adapter for redirecting.
 * Exposed to allow easy mocking in test environments.
 */
export const navigationAdapter = {
  redirect: (url) => {
    if (typeof window !== 'undefined') {
      try {
        window.location.href = url;
      } catch {
        // Fallback for environments where location is read-only
      }
    }
  },
};

/**
 * Dispatch a global toast notification event.
 *
 * @param {'info' | 'error' | 'success'} type
 * @param {string} message
 */
export function emitToast(type, message) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: { type, message },
      }),
    );
  }
}

/**
 * Perform a fetch request to the backend with envelope unwrapping and error handling.
 *
 * @param {string} endpoint - API path or full URL
 * @param {RequestInit} [options={}] - Fetch options
 * @param {boolean} [returnMeta=false] - Whether to return { data, meta }
 * @returns {Promise<any>}
 */
export async function sendRequest(endpoint, options = {}, returnMeta = false) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      err?.message
        ? `Network error: ${err.message}`
        : 'Network error. Please check your connection and try again.',
    );
  }

  let json = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  }

  // Handle HTTP errors or envelope errors
  if (!res.ok || (json && json.success === false)) {
    const status = res.status;
    const errorPayload = json?.error || {};
    const code = errorPayload.code || (status === 401 ? 'UNAUTHENTICATED' : 'HTTP_ERROR');
    const message = errorPayload.message || res.statusText || 'Request failed';
    const details = errorPayload.details || [];

    const isLoginOrRegister =
      endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
    const isSessionCheck = endpoint.includes('/auth/me');

    // 1. Handle 401 Unauthorized globally
    if (status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));

        // For regular protected routes, notify and redirect
        if (!isLoginOrRegister && !isSessionCheck) {
          emitToast('error', 'Please log in again');

          const currentPath = window.location.pathname + window.location.search;
          const nextQuery =
            currentPath && currentPath !== '/' && !currentPath.startsWith('/login')
              ? `?next=${encodeURIComponent(currentPath)}`
              : '';

          // Defer navigation slightly so state update propagates
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              navigationAdapter.redirect(`/login${nextQuery}`);
            }
          }, 50);
        }
      }
    }

    // 2. Handle 429 Rate Limited globally
    if (status === 429) {
      emitToast('error', 'Slow down a little and try again in a minute.');
    }

    throw new ApiError(status, code, message, details);
  }

  // Handle successful response following the envelope { success: true, data, meta }
  if (json && json.success === true) {
    if (returnMeta) {
      return { data: json.data, meta: json.meta };
    }
    return json.data;
  }

  // Fallback for non-enveloped responses
  if (returnMeta) {
    return { data: json, meta: undefined };
  }
  return json;
}

export const http = {
  get: (endpoint, options) => sendRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    sendRequest(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (endpoint, body, options) =>
    sendRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (endpoint, body, options) =>
    sendRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint, options) => sendRequest(endpoint, { ...options, method: 'DELETE' }),
};

export const api = http;

export const apiWithMeta = {
  get: (endpoint, options) => sendRequest(endpoint, { ...options, method: 'GET' }, true),
  post: (endpoint, body, options) =>
    sendRequest(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      true,
    ),
  put: (endpoint, body, options) =>
    sendRequest(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      true,
    ),
  patch: (endpoint, body, options) =>
    sendRequest(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      true,
    ),
  delete: (endpoint, options) => sendRequest(endpoint, { ...options, method: 'DELETE' }, true),
};

export default http;
