import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { respond } from '../utils/respond.js';

let mlCache = {
  status: null,
  timestamp: 0,
};

/**
 * Checks connectivity to the ML microservice.
 * Enforces a 1000ms timeout and caches status for 10 seconds.
 * Guaranteed not to throw.
 *
 * @returns {Promise<'up' | 'down' | 'unknown'>}
 */
export async function checkMlStatus() {
  const now = Date.now();
  if (mlCache.status && now - mlCache.timestamp < 10000) {
    return mlCache.status;
  }

  const mlUrl = env.ML_SERVICE_URL || process.env.ML_SERVICE_URL || 'http://localhost:8000';
  if (!mlUrl) {
    mlCache = { status: 'unknown', timestamp: now };
    return 'unknown';
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);

    const res = await fetch(`${mlUrl.replace(/\/+$/, '')}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const status = res.ok ? 'up' : 'down';
    mlCache = { status, timestamp: now };
    return status;
  } catch {
    mlCache = { status: 'down', timestamp: now };
    return 'down';
  }
}

/**
 * Reset health check ML cache (useful for testing).
 */
export function resetMlHealthCache() {
  mlCache = { status: null, timestamp: 0 };
}

/**
 * GET /health and GET /api/health handler
 * Reports { status, db: 'up'|'down', ml: 'up'|'down'|'unknown' }.
 * Errors never crash the endpoint.
 */
export async function getHealth(req, res) {
  try {
    const isDbUp = mongoose.connection && mongoose.connection.readyState === 1;
    const dbStatus = isDbUp ? 'up' : 'down';
    const mlStatus = await checkMlStatus();

    const data = {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      db: dbStatus,
      ml: mlStatus,
    };

    return respond.ok(res, data);
  } catch {
    return respond.ok(res, {
      status: 'degraded',
      db: 'down',
      ml: 'unknown',
    });
  }
}

export default {
  getHealth,
  checkMlStatus,
  resetMlHealthCache,
};
