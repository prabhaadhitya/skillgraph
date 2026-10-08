import { api, USE_MOCKS } from './api.js';
import mockCareers from '../mocks/careers.mock.json';
import mockSkills from '../mocks/skills.mock.json';
import mockCareerSkills from '../mocks/career-skills.mock.json';

/**
 * Fetch list of active careers with skill counts.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getCareers() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockCareers));
  }
  const res = await api.get('/careers');
  return Array.isArray(res) ? res : res?.items || [];
}

/**
 * Fetch career details with required skills.
 *
 * @param {string} slug - Career slug
 * @returns {Promise<Object>}
 */
export async function getCareerDetail(slug) {
  if (USE_MOCKS) {
    const career = mockCareers.find((c) => c.slug === slug);
    if (!career) {
      throw new Error(`Career '${slug}' not found`);
    }

    const skillMap = new Map(mockSkills.map((s) => [s.slug, s]));
    const csList = mockCareerSkills.filter((cs) => cs.career === slug);

    const skills = csList.map((cs) => ({
      skill: skillMap.get(cs.skill) || {
        slug: cs.skill,
        name: cs.skill.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        category: 'general',
        difficulty: 2,
      },
      importance: cs.importance,
      requiredLevel: cs.requiredLevel,
    }));

    return {
      career,
      skills,
    };
  }

  return api.get(`/careers/${slug}`);
}

/**
 * Fetch catalog skills, optionally filtered by category or search query.
 *
 * @param {Object} [params={}]
 * @param {string} [params.category]
 * @param {string} [params.q]
 * @returns {Promise<Array<Object>>}
 */
export async function getSkills(params = {}) {
  if (USE_MOCKS) {
    let result = JSON.parse(JSON.stringify(mockSkills));
    if (params.category) {
      result = result.filter((s) => s.category === params.category);
    }
    if (params.q) {
      const q = params.q.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)),
      );
    }
    return result;
  }

  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.q) searchParams.set('q', params.q);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const res = await api.get(`/skills${qs ? `?${qs}` : ''}`);
  return Array.isArray(res) ? res : res?.skills || res?.items || [];
}

export default {
  getCareers,
  getCareerDetail,
  getSkills,
};
