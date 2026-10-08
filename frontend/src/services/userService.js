import { api, USE_MOCKS } from './api.js';
import { MOCK_USER, getActiveMockUser, setActiveMockUser } from './authService.js';

/**
 * Fetch current authenticated user.
 *
 * @returns {Promise<{ user: Object }>}
 */
export async function getMe() {
  if (USE_MOCKS) {
    return { user: getActiveMockUser() || MOCK_USER };
  }
  return api.get('/users/me');
}

/**
 * Update current user profile.
 *
 * @param {Object} data
 * @param {string} [data.name]
 * @param {string} [data.college]
 * @param {string} [data.degree]
 * @param {string} [data.branch]
 * @param {number} [data.semester]
 * @param {string} [data.targetCareerSlug]
 * @param {boolean} [data.onboardingCompleted]
 * @returns {Promise<{ user: Object }>}
 */
export async function patchMe(data) {
  if (USE_MOCKS) {
    const current = getActiveMockUser() || MOCK_USER;
    const updated = {
      ...current,
      ...data,
      targetCareer: data.targetCareerSlug
        ? {
            id: 'car_custom',
            slug: data.targetCareerSlug,
            name: data.targetCareerSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          }
        : current.targetCareer,
    };
    setActiveMockUser(updated);
    return { user: updated };
  }
  return api.patch('/users/me', data);
}

/**
 * Replace student skill proficiencies.
 *
 * @param {Array<{ skillSlug: string, proficiency: number }>} skills
 * @returns {Promise<{ items: Array<Object>, fit?: Object }>}
 */
export async function putSkills(skills) {
  if (USE_MOCKS) {
    return {
      items: skills.map((s) => ({
        skill: { slug: s.skillSlug, name: s.skillSlug },
        proficiency: s.proficiency,
      })),
      fit: {
        score: 61,
        band: 'developing',
      },
    };
  }
  return api.put('/users/me/skills', { skills });
}

export default {
  getMe,
  patchMe,
  putSkills,
};
