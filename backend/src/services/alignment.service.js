import { User } from '../models/user.model.js';
import { Career } from '../models/career.model.js';
import { AlignmentSnapshot } from '../models/alignmentSnapshot.model.js';
import { getCareerModel } from './careerModel.service.js';
import { getProfileMap } from './profile.service.js';
import { computeFit } from './engine/fit.js';
import { ApiError } from '../utils/ApiError.js';

import { BoundedCache } from '../utils/cache.js';

// In-memory bounded cache for alignment computations (30s TTL, max 1000 entries, LRU eviction)
const ALIGNMENT_CACHE_TTL_MS = 30 * 1000;
const alignmentCache = new BoundedCache({
  maxSize: 1000,
  ttlMs: ALIGNMENT_CACHE_TTL_MS,
  name: 'alignmentCache',
});

/**
 * Invalidate cached alignment for a user, or all users if no userId given.
 * @param {string|import('mongoose').Types.ObjectId} [userId]
 */
export function invalidateAlignmentCache(userId) {
  if (userId) {
    alignmentCache.delete(userId.toString());
  } else {
    alignmentCache.clear();
  }
}

/**
 * Check whether a user's alignment is currently cached in memory.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {boolean}
 */
export function isAlignmentCached(userId) {
  if (!userId) return false;
  return alignmentCache.has(userId.toString());
}

/**
 * Cache alignment result for a user.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Object} data
 */
export function cacheAlignment(userId, data) {
  if (!userId) return;
  alignmentCache.set(userId.toString(), data);
}

/**
 * Retrieve cached alignment result for a user if available.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Object|null}
 */
export function getCachedAlignment(userId) {
  if (!userId) return null;
  return alignmentCache.get(userId.toString()) || null;
}

/**
 * Diagnostic access to alignment cache instance.
 */
export function getAlignmentCache() {
  return alignmentCache;
}

/**
 * Record or merge an alignment snapshot for a student's target career.
 *
 * Rules (see docs/DATABASE.md §3.8):
 * - Compute fit with the engine using user's target career.
 * - If the latest snapshot for the same user and career is < 60 seconds old, UPDATE it. Otherwise insert.
 * - previousScore = fitScore of the latest snapshot older than the current one for that career, or null.
 * - band: early (<40), developing (<70), strong (>=70).
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} [trigger='skills_update'] - 'onboarding' | 'skills_update' | 'target_change'
 * @param {Object} [options={}]
 * @param {Date|number} [options.now] - Injected time provider for deterministic tests
 * @returns {Promise<{ score: number, previousScore: number|null, band: 'early'|'developing'|'strong' }>}
 */
export async function recordSnapshot(userId, trigger = 'skills_update', options = {}) {
  const session = options.session || null;

  if (options.failAt === 'in_snapshot') {
    throw new Error('Failure injected in alignmentService.recordSnapshot (in_snapshot)');
  }

  const userQuery = User.findById(userId);
  if (session) userQuery.session(session);
  const user = await userQuery;

  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  if (!user.targetCareerId) {
    throw new ApiError(422, 'RULE_VIOLATION', 'User has no target career set');
  }

  const careerQuery = Career.findById(user.targetCareerId);
  if (session) careerQuery.session(session);
  const career = await careerQuery;

  if (!career) {
    throw new ApiError(404, 'NOT_FOUND', 'Target career not found');
  }

  const { model } = await getCareerModel(career.slug);
  const profile = await getProfileMap(userId, { session });
  const fit = computeFit(model, profile);

  const score = fit.fitScore;
  const band = fit.band;
  const coverage = fit.coverage;
  const readiness = fit.readiness;

  const now = options.now instanceof Date
    ? options.now
    : (typeof options.now === 'number' ? new Date(options.now) : new Date());

  // Find latest snapshot for this user and career
  let snapshotQuery = AlignmentSnapshot.findOne({
    userId,
    careerId: career._id,
  }).sort({ createdAt: -1 });
  if (session) snapshotQuery = snapshotQuery.session(session);
  const latestSnapshot = await snapshotQuery;

  const isUnder60s = latestSnapshot &&
    now.getTime() - new Date(latestSnapshot.createdAt).getTime() < 60 * 1000;

  let previousScore = null;

  if (isUnder60s) {
    // Under 60 seconds old: update existing latest snapshot
    latestSnapshot.fitScore = score;
    latestSnapshot.coverage = coverage;
    latestSnapshot.readiness = readiness;
    if (trigger) {
      latestSnapshot.trigger = trigger;
    }
    await latestSnapshot.save({ session });

    // previousScore is the score of the latest snapshot older than this updated one
    let olderQuery = AlignmentSnapshot.findOne({
      userId,
      careerId: career._id,
      createdAt: { $lt: latestSnapshot.createdAt },
    }).sort({ createdAt: -1 });
    if (session) olderQuery = olderQuery.session(session);
    const olderSnapshot = await olderQuery;

    previousScore = olderSnapshot ? olderSnapshot.fitScore : null;
  } else {
    // More than 60 seconds old (or first snapshot): previousScore is the latest prior snapshot
    previousScore = latestSnapshot ? latestSnapshot.fitScore : null;

    // Insert fresh snapshot
    if (session) {
      await AlignmentSnapshot.create(
        [
          {
            userId,
            careerId: career._id,
            fitScore: score,
            coverage,
            readiness,
            trigger: trigger || 'skills_update',
            createdAt: now,
          },
        ],
        { session },
      );
    } else {
      await AlignmentSnapshot.create({
        userId,
        careerId: career._id,
        fitScore: score,
        coverage,
        readiness,
        trigger: trigger || 'skills_update',
        createdAt: now,
      });
    }
  }

  const result = {
    score,
    previousScore,
    band,
  };

  if (!session) {
    cacheAlignment(userId, result);
  }

  return result;
}

export default {
  recordSnapshot,
  invalidateAlignmentCache,
  isAlignmentCached,
  cacheAlignment,
};
