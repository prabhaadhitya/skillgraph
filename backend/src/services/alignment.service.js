import { User } from '../models/user.model.js';
import { Career } from '../models/career.model.js';
import { AlignmentSnapshot } from '../models/alignmentSnapshot.model.js';
import { getCareerModel } from './careerModel.service.js';
import { getProfileMap } from './profile.service.js';
import { computeFit } from './engine/fit.js';
import { ApiError } from '../utils/ApiError.js';

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
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  if (!user.targetCareerId) {
    throw new ApiError(422, 'RULE_VIOLATION', 'User has no target career set');
  }

  const career = await Career.findById(user.targetCareerId);
  if (!career) {
    throw new ApiError(404, 'NOT_FOUND', 'Target career not found');
  }

  const { model } = await getCareerModel(career.slug);
  const profile = await getProfileMap(userId);
  const fit = computeFit(model, profile);

  const score = fit.fitScore;
  const band = fit.band;
  const coverage = fit.coverage;
  const readiness = fit.readiness;

  const now = options.now instanceof Date
    ? options.now
    : (typeof options.now === 'number' ? new Date(options.now) : new Date());

  // Find latest snapshot for this user and career
  const latestSnapshot = await AlignmentSnapshot.findOne({
    userId,
    careerId: career._id,
  }).sort({ createdAt: -1 });

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
    await latestSnapshot.save();

    // previousScore is the score of the latest snapshot older than this updated one
    const olderSnapshot = await AlignmentSnapshot.findOne({
      userId,
      careerId: career._id,
      createdAt: { $lt: latestSnapshot.createdAt },
    }).sort({ createdAt: -1 });

    previousScore = olderSnapshot ? olderSnapshot.fitScore : null;
  } else {
    // More than 60 seconds old (or first snapshot): previousScore is the latest prior snapshot
    previousScore = latestSnapshot ? latestSnapshot.fitScore : null;

    // Insert fresh snapshot
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

  return {
    score,
    previousScore,
    band,
  };
}

export default {
  recordSnapshot,
};
