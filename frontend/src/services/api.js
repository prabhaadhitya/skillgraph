const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/**
 * Custom error class representing SkillGraph API errors.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} code - Error code (e.g., 'VALIDATION_ERROR', 'UNAUTHENTICATED')
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
 * Perform a fetch request to the backend with envelope unwrapping.
 *
 * @param {string} endpoint - API path or full URL
 * @param {RequestInit} [options={}] - Fetch options
 * @param {boolean} [returnMeta=false] - Whether to return { data, meta }
 * @returns {Promise<any>}
 */
async function sendRequest(endpoint, options = {}, returnMeta = false) {
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
    throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Network connection failed');
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

    // Trigger global unauthorized event on 401 (excluding login and register endpoints)
    const isAuthRoute =
      (method === 'POST' && endpoint.includes('/auth/login')) ||
      (method === 'POST' && endpoint.includes('/auth/register'));

    if (status === 401 && !isAuthRoute && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    throw new ApiError(status, code, message, details);
  }

  // Handle successful response
  if (json && json.success === true) {
    if (returnMeta) {
      return { data: json.data, meta: json.meta };
    }
    return json.data;
  }

  // If response didn't follow the envelope (fallback)
  if (returnMeta) {
    return { data: json, meta: undefined };
  }
  return json;
}

export const api = {
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

export default api;
