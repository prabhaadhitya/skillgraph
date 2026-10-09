const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'apikey',
  'apikeyenc',
  'authorization',
  'cookie',
  'body',
];

const sanitize = (val) => {
  if (typeof val === 'string') {
    return val
      .replace(/bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/sk-[A-Za-z0-9-_]+/gi, 'sk-[REDACTED]')
      .replace(/password[:=]\s*[^\s,]+/gi, 'password=[REDACTED]');
  }

  if (typeof val === 'object' && val !== null) {
    if (val instanceof Error) {
      return {
        name: val.name,
        message: sanitize(val.message),
        stack: typeof val.stack === 'string' ? sanitize(val.stack) : val.stack,
      };
    }

    const clean = {};
    for (const [key, v] of Object.entries(val)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEY_PATTERNS.some((pat) => lower.includes(pat))) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = typeof v === 'object' && v !== null ? sanitize(v) : v;
      }
    }
    return clean;
  }

  return val;
};

/**
 * Standard application logger that redacts sensitive information.
 * Never logs bodies, passwords, tokens, or keys.
 */
export const logger = {
  info(...args) {
    const sanitized = args.map(sanitize);
    // eslint-disable-next-line no-console
    console.info(`[${new Date().toISOString()}] [INFO]:`, ...sanitized);
  },

  warn(...args) {
    const sanitized = args.map(sanitize);
    // eslint-disable-next-line no-console
    console.warn(`[${new Date().toISOString()}] [WARN]:`, ...sanitized);
  },

  error(...args) {
    const sanitized = args.map(sanitize);
    // eslint-disable-next-line no-console
    console.error(`[${new Date().toISOString()}] [ERROR]:`, ...sanitized);
  },
};

export default logger;
