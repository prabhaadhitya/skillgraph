import crypto from 'crypto';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'sg_token';
export const CSRF_COOKIE_NAME = 'sg_csrf';

/**
 * Determine the SameSite setting for cookies.
 * Supports: 'lax', 'strict', 'none'.
 * - In local development or same-origin proxy: 'lax'
 * - In cross-site hosting (e.g. Vercel frontend directly accessing Render backend): 'none'
 *
 * @returns {'lax' | 'strict' | 'none'}
 */
export const getCookieSameSite = () => {
  const configured = env.COOKIE_SAME_SITE || process.env.COOKIE_SAME_SITE;
  if (configured && ['lax', 'strict', 'none'].includes(String(configured).toLowerCase())) {
    return String(configured).toLowerCase();
  }
  return 'lax';
};

/**
 * Get cookie options for sg_token and session cookies.
 * CRITICAL: Browsers strictly reject SameSite=None cookies unless Secure=true.
 *
 * @param {Object} [overrides={}]
 * @returns {import('express').CookieOptions}
 */
export const getCookieOptions = (overrides = {}) => {
  const sameSite = overrides.sameSite || getCookieSameSite();
  const isProd = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

  // If sameSite is 'none', modern browsers mandate secure: true
  const isSecure =
    sameSite === 'none'
      ? true
      : isProd
        ? true
        : env.COOKIE_SECURE !== undefined
          ? Boolean(env.COOKIE_SECURE)
          : false;

  return {
    httpOnly: overrides.httpOnly !== undefined ? overrides.httpOnly : true,
    sameSite,
    secure: isSecure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...overrides,
  };
};

/**
 * Generate a cryptographically secure random CSRF token.
 *
 * @returns {string}
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Set the authentication cookie and optional CSRF cookie on the response.
 *
 * @param {import('express').Response} res
 * @param {string} token
 * @param {string|null} [csrfToken=null]
 */
export const setAuthCookie = (res, token, csrfToken = null) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions({ httpOnly: true }));

  if (csrfToken) {
    res.cookie(
      CSRF_COOKIE_NAME,
      csrfToken,
      getCookieOptions({ httpOnly: false }), // Client JS must read for double-submit header
    );
  }
};

/**
 * Clear the authentication and CSRF cookies on the response.
 *
 * @param {import('express').Response} res
 */
export const clearAuthCookie = (res) => {
  const authOpts = getCookieOptions({ httpOnly: true });
  delete authOpts.maxAge;
  res.clearCookie(COOKIE_NAME, authOpts);

  const csrfOpts = getCookieOptions({ httpOnly: false });
  delete csrfOpts.maxAge;
  res.clearCookie(CSRF_COOKIE_NAME, csrfOpts);
};

export default {
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getCookieSameSite,
  getCookieOptions,
  generateCsrfToken,
  setAuthCookie,
  clearAuthCookie,
};
