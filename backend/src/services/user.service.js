import { User } from '../models/user.model.js';
import { Career } from '../models/career.model.js';
import { ApiError } from '../utils/ApiError.js';
import { formatUser } from '../utils/formatUser.js';

/**
 * Get current user profile.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const getProfile = async (userId) => {
  const user = await User.findById(userId).populate('targetCareerId');
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }
  return formatUser(user);
};

/**
 * Update current user profile.
 * Validates active career existence for targetCareerSlug and enforces onboarding rules.
 *
 * @param {string} userId
 * @param {Object} patchData
 * @returns {Promise<Object>}
 */
export const updateProfile = async (userId, patchData) => {
  const user = await User.findById(userId).populate('targetCareerId');
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  // Handle targetCareerSlug change
  if (patchData.targetCareerSlug !== undefined) {
    const career = await Career.findOne({
      slug: patchData.targetCareerSlug,
      isActive: true,
    });

    if (!career) {
      throw new ApiError(404, 'NOT_FOUND', `Career '${patchData.targetCareerSlug}' not found`);
    }

    const currentCareerId = user.targetCareerId
      ? (user.targetCareerId._id || user.targetCareerId).toString()
      : null;

    if (currentCareerId !== career._id.toString()) {
      user.targetCareerId = career._id;
      // TODO(Member 3): record alignment snapshot with trigger target_change
    }
  }

  // Handle onboardingCompleted
  if (patchData.onboardingCompleted !== undefined) {
    if (patchData.onboardingCompleted === true && !user.targetCareerId) {
      throw new ApiError(
        422,
        'RULE_VIOLATION',
        'Cannot complete onboarding without selecting a target career',
      );
    }
    user.onboardingCompleted = patchData.onboardingCompleted;
  }

  // Handle profile detail fields
  if (patchData.name !== undefined) user.name = patchData.name;
  if (patchData.college !== undefined) user.college = patchData.college;
  if (patchData.degree !== undefined) user.degree = patchData.degree;
  if (patchData.branch !== undefined) user.branch = patchData.branch;
  if (patchData.semester !== undefined) user.semester = patchData.semester;

  await user.save();
  await user.populate('targetCareerId');

  return formatUser(user);
};

export default {
  getProfile,
  updateProfile,
};
