/**
 * SkillGraph URL & Navigation Security Utilities
 *
 * Provides strict validation and sanitization for:
 * 1. Post-login and in-app navigation destinations (prevents Open Redirect attacks via ?next=).
 * 2. API endpoints in sendRequest (prevents SSRF, credential leakage, and untrusted endpoint requests).
 */

// Approved internal route prefixes for navigation in SkillGraph
export const APPROVED_INTERNAL_PREFIXES = [
  '/',
  '/onboarding',
  '/app',
  '/admin',
  '/_kit',
  '/login',
  '/register',
];

// Routes disallowed as post-login redirect targets to avoid redirect loops
export const DISALLOWED_POST_LOGIN_PATHS = [
  '/login',
  '/register',
];

/**
 * Custom error thrown when an untrusted or malformed endpoint is passed to sendRequest.
 */
export class UntrustedEndpointError extends Error {
  /**
   * @param {string} [message]
   * @param {string} [code='UNTRUSTED_ENDPOINT']
   */
  constructor(message = 'Requests to untrusted endpoints are not permitted', code = 'UNTRUSTED_ENDPOINT') {
    super(message);
    this.name = 'UntrustedEndpointError';
    this.code = code;
    this.status = 400;
  }
}

/**
 * Returns true if the string contains ASCII control characters (0-31 or 127).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function hasControlChar(str) {
  if (typeof str !== 'string') return false;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a candidate URL or path is a safe, approved internal navigation destination.
 * Rejects external URLs, protocol-relative URLs, backslash bypasses, and unapproved routes.
 *
 * @param {string} url - Candidate URL or path string
 * @param {Object} [options={}]
 * @param {boolean} [options.allowLoginRegister=true] - Whether /login and /register are allowed
 * @param {string} [options.currentOrigin] - Expected origin if testing or non-browser environment
 * @returns {boolean}
 */
export function isValidInternalDestination(url, options = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    return false;
  }

  // 1. Reject control characters, newlines, carriage returns, and null bytes on raw input
  if (hasControlChar(url) || /%0[0-9a-fA-F]|%1[0-9a-fA-F]/i.test(url)) {
    return false;
  }

  const trimmed = url.trim();

  // 2. Reject backslashes (Windows path / browser quirks like /\evil.com, /app\evil.com)
  if (trimmed.includes('\\')) {
    return false;
  }

  // 3. Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//')) {
    return false;
  }

  // 4. Reject dangerous URI schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  let relativePath = trimmed;

  // 5. Handle absolute HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return false;
    }

    const expectedOrigin =
      options.currentOrigin ||
      (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : null);

    // If origin does not match the active site origin, it is an external URL
    if (!expectedOrigin || parsed.origin.toLowerCase() !== expectedOrigin.toLowerCase()) {
      return false;
    }

    // Extract relative pathname + search + hash from same-origin URL
    relativePath = parsed.pathname + parsed.search + parsed.hash;
  }

  // 6. Must start with a single forward slash
  if (!relativePath.startsWith('/') || relativePath.startsWith('//')) {
    return false;
  }

  // 7. Reject directory traversal attempts (/app/../evil, /../../evil)
  if (/\/\.\.(\/|$)/.test(relativePath)) {
    return false;
  }

  // 8. Extract pathname portion (before ? and #)
  const [rawPath] = relativePath.split(/[?#]/);
  const normalizedPath = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;

  // 9. Check disallowed post-login paths if configured
  if (options.allowLoginRegister === false) {
    if (
      normalizedPath === '/login' ||
      normalizedPath === '/register' ||
      normalizedPath.startsWith('/login/') ||
      normalizedPath.startsWith('/register/')
    ) {
      return false;
    }
  }

  // 10. Verify against approved route prefixes
  const isApproved = APPROVED_INTERNAL_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return normalizedPath === '/';
    }
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  });

  return isApproved;
}

/**
 * Checks whether a candidate URL is an approved post-login redirect destination.
 * Disallows /login and /register to avoid navigation loops.
 *
 * @param {string} url
 * @param {Object} [options={}]
 * @returns {boolean}
 */
export function isValidPostLoginDestination(url, options = {}) {
  return isValidInternalDestination(url, { ...options, allowLoginRegister: false });
}

/**
 * Sanitizes a post-login navigation destination.
 * Returns the candidate destination if valid, otherwise returns the fallback.
 *
 * @param {string|null|undefined} url
 * @param {string} [fallback='/app/dashboard']
 * @param {Object} [options={}]
 * @returns {string}
 */
export function sanitizePostLoginDestination(url, fallback = '/app/dashboard', options = {}) {
  if (isValidPostLoginDestination(url, options)) {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return parsed.pathname + parsed.search + parsed.hash;
      } catch {
        return fallback;
      }
    }
    return trimmed;
  }
  return fallback;
}

/**
 * Sanitizes an internal destination.
 * Returns the candidate destination if valid, otherwise returns the fallback.
 *
 * @param {string|null|undefined} url
 * @param {string} [fallback='/']
 * @param {Object} [options={}]
 * @returns {string}
 */
export function sanitizeInternalDestination(url, fallback = '/', options = {}) {
  if (isValidInternalDestination(url, options)) {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return parsed.pathname + parsed.search + parsed.hash;
      } catch {
        return fallback;
      }
    }
    return trimmed;
  }
  return fallback;
}

// Registry of dynamically configured trusted origins for sendRequest
const customTrustedOrigins = new Set();

/**
 * Register an additional trusted origin for sendRequest (e.g. for multi-environment testing).
 * @param {string} origin
 */
export function addTrustedOrigin(origin) {
  if (origin && typeof origin === 'string') {
    try {
      const parsed = new URL(origin);
      customTrustedOrigins.add(parsed.origin.toLowerCase());
    } catch {
      customTrustedOrigins.add(origin.trim().toLowerCase());
    }
  }
}

/**
 * Remove a trusted origin.
 * @param {string} origin
 */
export function removeTrustedOrigin(origin) {
  if (origin && typeof origin === 'string') {
    try {
      const parsed = new URL(origin);
      customTrustedOrigins.delete(parsed.origin.toLowerCase());
    } catch {
      customTrustedOrigins.delete(origin.trim().toLowerCase());
    }
  }
}

/**
 * Clear all custom trusted origins.
 */
export function clearTrustedOrigins() {
  customTrustedOrigins.clear();
}

/**
 * Collect all active trusted origins for API requests.
 *
 * @param {string} [base='/api']
 * @returns {Set<string>}
 */
export function getTrustedOrigins(base = '/api') {
  const origins = new Set(customTrustedOrigins);

  // 1. Origin of BASE if BASE is an absolute URL
  const cleanBase = (base || '').trim();
  if (/^https?:\/\//i.test(cleanBase)) {
    try {
      origins.add(new URL(cleanBase).origin.toLowerCase());
    } catch {
      // Ignore malformed base
    }
  }

  // 2. Current window origin if running in browser
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    origins.add(window.location.origin.toLowerCase());
  }

  // 3. VITE_API_BASE_URL if set to an absolute URL
  const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : ''
  ).trim();

  if (/^https?:\/\//i.test(envBase)) {
    try {
      origins.add(new URL(envBase).origin.toLowerCase());
    } catch {
      // Ignore
    }
  }

  return origins;
}

/**
 * Resolves and validates an endpoint for sendRequest.
 * Enforces:
 * - Rejection of protocol-relative URLs (//evil.com).
 * - Rejection of malformed paths containing backslashes (/\evil.com).
 * - Rejection of unsupported schemes (javascript:, data:, file:).
 * - Strict origin validation for absolute URLs (prevents requests and cookies sent to untrusted endpoints).
 * - Proper prefixing of relative endpoints with BASE.
 *
 * @param {string} endpoint - API path or full URL
 * @param {string} [base='/api'] - Configured API base path or URL
 * @returns {string} Fully resolved and validated URL
 * @throws {UntrustedEndpointError} If endpoint is untrusted or malformed
 */
export function resolveAndValidateApiUrl(endpoint, base = '/api') {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new UntrustedEndpointError('API endpoint must be a non-empty string');
  }

  // Reject control characters and unencoded/encoded null bytes
  if (hasControlChar(endpoint) || /%0[0-9a-fA-F]|%1[0-9a-fA-F]/i.test(endpoint)) {
    throw new UntrustedEndpointError('Malformed endpoint path containing control characters');
  }

  const trimmed = endpoint.trim();

  // 1. Reject protocol-relative URLs
  if (trimmed.startsWith('//')) {
    throw new UntrustedEndpointError('Protocol-relative URLs are not permitted');
  }

  // 2. Reject backslashes
  if (trimmed.includes('\\')) {
    throw new UntrustedEndpointError('Malformed endpoint path containing backslashes');
  }

  // 3. Reject dangerous schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new UntrustedEndpointError('Unsupported URL scheme in endpoint');
  }

  const cleanBase = (base || '/api').trim();
  const trustedOrigins = getTrustedOrigins(cleanBase);

  // 4. Handle absolute HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new UntrustedEndpointError('Malformed absolute URL');
    }

    const endpointOrigin = parsedUrl.origin.toLowerCase();
    const isTrusted = trustedOrigins.has(endpointOrigin);

    if (!isTrusted) {
      throw new UntrustedEndpointError(
        `Requests to untrusted endpoint "${parsedUrl.origin}" are blocked`,
      );
    }

    return trimmed;
  }

  // 5. Relative endpoint: clean and resolve against base
  const resolvedBase = cleanBase.replace(/\/+$/, '');
  const resolvedPath = trimmed.replace(/^\/+/, '');
  return `${resolvedBase}/${resolvedPath}`;
}

export default {
  isValidInternalDestination,
  isValidPostLoginDestination,
  sanitizePostLoginDestination,
  sanitizeInternalDestination,
  resolveAndValidateApiUrl,
  addTrustedOrigin,
  removeTrustedOrigin,
  clearTrustedOrigins,
  getTrustedOrigins,
  UntrustedEndpointError,
};
