import { env } from '../config/env.js';

export const COOKIE_NAME = 'sg_token';

/**
 * Get cookie options for sg_token.
 * httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 days.
 * secure flag respects COOKIE_SECURE setting (or true in production).
 */
export const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE !== undefined ? Boolean(env.COOKIE_SECURE) : env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

/**
 * Set the authentication cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

/**
 * Clear the authentication cookie on the response.
 * @param {import('express').Response} res
 */
export const clearAuthCookie = (res) => {
  const options = getCookieOptions();
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
};

export default {
  COOKIE_NAME,
  getCookieOptions,
  setAuthCookie,
  clearAuthCookie,
};
