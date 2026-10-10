import crypto from 'crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  getCookieOptions,
} from '../utils/authCookie.js';

// Safe HTTP methods per RFC 7231 / OWASP CSRF prevention
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Checks whether a given Origin matches the configured client origins.
 *
 * @param {string|null} origin
 * @param {string} [clientOriginStr]
 * @returns {boolean}
 */
export function isAllowedOrigin(origin, clientOriginStr = null) {
  if (!origin) return true; // non-browser or direct curl/server calls

  const originsConfig = clientOriginStr || process.env.CLIENT_ORIGIN || env.CLIENT_ORIGIN || 'http://localhost:5173';
  const normalized = origin.trim().replace(/\/+$/, '');
  const allowed = originsConfig
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return allowed.some((allowedOrigin) => {
    if (allowedOrigin.includes('*')) {
      const regexStr = '^' + allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      return new RegExp(regexStr).test(normalized);
    }
    return allowedOrigin === normalized;
  });
}

/**
 * CSRF Protection Middleware.
 * Provides defense-in-depth against Cross-Site Request Forgery:
 * 1. Origin verification against allowed domains on state-changing requests.
 * 2. Double-Submit Cookie verification (x-csrf-token header matching sg_csrf cookie)
 *    for cookie-authenticated sessions.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const csrfProtection = (req, res, next) => {
  const method = req.method.toUpperCase();
  const isSafe = SAFE_METHODS.has(method);

  // Ensure a valid CSRF token is present on the client
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfToken || typeof csrfToken !== 'string') {
    csrfToken = generateCsrfToken();
    // Only attach cookie on safe methods or dedicated csrf endpoint
    // to keep auth cookie at set-cookie[0] on login/register mutations
    if (isSafe || req.path.endsWith('/csrf')) {
      res.cookie(
        CSRF_COOKIE_NAME,
        csrfToken,
        getCookieOptions({ httpOnly: false }),
      );
    }
  }

  // Expose token in response header for client inspection
  res.setHeader('X-CSRF-Token', csrfToken);
  req.csrfToken = csrfToken;

  // Safe HTTP methods do not alter state and are exempt from CSRF validation
  if (isSafe) {
    return next();
  }

  // 1. Origin header verification (when present)
  const incomingOrigin = req.headers.origin;
  if (incomingOrigin) {
    let originHost = incomingOrigin;
    try {
      originHost = new URL(incomingOrigin).origin;
    } catch {
      // Use raw string if URL parse fails
    }

    if (!isAllowedOrigin(originHost)) {
      return next(
        new ApiError(403, 'CSRF_ERROR', `Cross-origin request from ${incomingOrigin} rejected`),
      );
    }
  }

  // 2. Cookie-based session CSRF check
  // Non-cookie requests (e.g. Bearer auth) or unauthenticated requests are not vulnerable to ambient cookie CSRF
  const hasAuthCookie = Boolean(req.cookies?.[COOKIE_NAME]);
  if (!hasAuthCookie) {
    return next();
  }

  // In test environment, bypass check unless ENFORCE_CSRF is explicitly active
  if (process.env.NODE_ENV === 'test' && !process.env.ENFORCE_CSRF) {
    return next();
  }

  // Double-submit token verification
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken) {
    return next(new ApiError(403, 'CSRF_ERROR', 'CSRF token missing'));
  }

  // Timing-safe comparison to prevent timing attacks
  const headerBuf = Buffer.from(String(headerToken));
  const cookieBuf = Buffer.from(String(cookieToken));

  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return next(new ApiError(403, 'CSRF_ERROR', 'Invalid CSRF token'));
  }

  next();
};

export default csrfProtection;
