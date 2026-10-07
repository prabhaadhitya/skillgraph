/**
 * Resolves which API key to use for an LLM request following the fallback hierarchy.
 *
 * Hierarchy:
 * 1. User-supplied key if present -> { source: 'user', apiKey }
 * 2. Server fallback key if available and under daily limit -> { source: 'server', apiKey, remaining }
 * 3. Otherwise -> { source: 'none', reason: 'NO_KEY' | 'DAILY_LIMIT' }
 *
 * @param {object} params
 * @param {boolean} params.userKeyPresent - True if the user has a stored encrypted key
 * @param {Function | string} [params.decryptUserKey] - Function that decrypts and returns user's plaintext key
 * @param {string | null} [params.serverKey] - System fallback OpenRouter key from env
 * @param {{ date: string, count: number } | null} [params.usage] - Current server key usage tracking record
 * @param {number} [params.dailyLimit=30] - Max server key requests allowed per user per day
 * @param {string} [params.today] - Current date in 'YYYY-MM-DD' format
 * @returns {{ source: 'user', apiKey: string } | { source: 'server', apiKey: string, remaining: number } | { source: 'none', reason: 'NO_KEY' | 'DAILY_LIMIT' }}
 */
export function resolveKey({
  userKeyPresent,
  decryptUserKey,
  serverKey,
  usage,
  dailyLimit = 30,
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  // 1. User has their own BYOK key
  if (userKeyPresent) {
    const apiKey = typeof decryptUserKey === 'function' ? decryptUserKey() : decryptUserKey;
    return {
      source: 'user',
      apiKey,
    };
  }

  // Check if a server fallback key exists
  const hasServerKey = Boolean(serverKey && typeof serverKey === 'string' && serverKey.trim().length > 0);

  if (!hasServerKey) {
    return {
      source: 'none',
      reason: 'NO_KEY',
    };
  }

  // Determine current usage count for 'today' (rollover from previous dates resets to 0)
  const isToday = usage && usage.date === today;
  const currentCount = isToday && typeof usage.count === 'number' ? usage.count : 0;

  // 2. Server fallback key under daily limit
  if (currentCount < dailyLimit) {
    const remaining = Math.max(0, dailyLimit - currentCount);
    return {
      source: 'server',
      apiKey: serverKey,
      remaining,
    };
  }

  // 3. Server fallback daily limit reached
  return {
    source: 'none',
    reason: 'DAILY_LIMIT',
  };
}

/**
 * Calculates the next usage record after consuming one server-key request.
 * Pure function: does not mutate the input record.
 *
 * @param {{ date: string, count: number } | null} usage - Existing usage record
 * @param {string} [today] - Current date in 'YYYY-MM-DD' format
 * @returns {{ date: string, count: number }} Updated usage record
 */
export function nextUsage(usage, today = new Date().toISOString().slice(0, 10)) {
  const isToday = usage && usage.date === today;
  const currentCount = isToday && typeof usage.count === 'number' ? usage.count : 0;

  return {
    date: today,
    count: currentCount + 1,
  };
}
