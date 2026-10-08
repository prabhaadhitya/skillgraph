import { api, USE_MOCKS } from './api.js';
import { MOCK_USER, getActiveMockUser, setActiveMockUser } from './authService.js';
import mockCatalogSkills from '../mocks/skills.mock.json';
import { LEVEL_NAMES } from '../components/ui/LevelPicker.jsx';

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


const INITIAL_MOCK_USER_SKILLS = [
  { skillSlug: 'programming-fundamentals', proficiency: 4 },
  { skillSlug: 'python', proficiency: 4 },
  { skillSlug: 'javascript', proficiency: 4 },
  { skillSlug: 'html', proficiency: 3 },
  { skillSlug: 'css', proficiency: 3 },
  { skillSlug: 'react', proficiency: 3 },
  { skillSlug: 'sql', proficiency: 3 },
  { skillSlug: 'numpy', proficiency: 3 },
  { skillSlug: 'pandas', proficiency: 2 },
  { skillSlug: 'statistics', proficiency: 1 },
  { skillSlug: 'ml-fundamentals', proficiency: 1 },
  { skillSlug: 'git', proficiency: 3 },
  { skillSlug: 'github', proficiency: 2 },
  { skillSlug: 'command-line', proficiency: 3 },
  { skillSlug: 'linux', proficiency: 2 },
  { skillSlug: 'docker', proficiency: 1 },
];

let inMemoryUserSkills = [...INITIAL_MOCK_USER_SKILLS];

function buildSkillItem(skillSlug, proficiency) {
  const meta = mockCatalogSkills.find((s) => s.slug === skillSlug) || {
    slug: skillSlug,
    name: skillSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    category: 'general',
  };
  return {
    skill: meta,
    proficiency,
    levelLabel: LEVEL_NAMES[proficiency] || `Level ${proficiency}`,
    source: 'self_reported',
  };
}

/**
 * Replace student skill proficiencies.
 *
 * @param {Array<{ skillSlug: string, proficiency: number }>} skills
 * @returns {Promise<{ items: Array<Object>, fit?: Object }>}
 */
export async function putSkills(skills) {
  if (USE_MOCKS) {
    inMemoryUserSkills = skills
      .filter((s) => s.proficiency > 0)
      .map((s) => ({ skillSlug: s.skillSlug, proficiency: s.proficiency }));

    const items = inMemoryUserSkills.map((s) => buildSkillItem(s.skillSlug, s.proficiency));
    return {
      items,
      fit: {
        score: 26,
        band: 'early',
      },
    };
  }
  return api.put('/users/me/skills', { skills });
}

/**
 * Fetch student skills.
 * GET /users/me/skills
 *
 * @returns {Promise<{ items: Array<Object> }>}
 */
export async function getUserSkills() {
  if (USE_MOCKS) {
    const active = getActiveMockUser();
    if (active?.email?.includes('newbie') && !active.onboardingCompleted) {
      return { items: [] };
    }
    const items = inMemoryUserSkills.map((s) => buildSkillItem(s.skillSlug, s.proficiency));
    return { items };
  }
  return api.get('/users/me/skills');
}

/**
 * Update a single skill proficiency.
 * PATCH /users/me/skills/:skillSlug
 *
 * @param {string} skillSlug
 * @param {number} proficiency
 * @returns {Promise<{ skill: Object, proficiency: number }>}
 */
export async function patchSkill(skillSlug, proficiency) {
  if (USE_MOCKS) {
    const idx = inMemoryUserSkills.findIndex((s) => s.skillSlug === skillSlug);
    const prevLevel = idx >= 0 ? inMemoryUserSkills[idx].proficiency : 0;
    if (proficiency === 0) {
      if (idx >= 0) inMemoryUserSkills.splice(idx, 1);
    } else {
      if (idx >= 0) {
        inMemoryUserSkills[idx].proficiency = proficiency;
      } else {
        inMemoryUserSkills.push({ skillSlug, proficiency });
      }
    }
    const meta = mockCatalogSkills.find((s) => s.slug === skillSlug) || {
      slug: skillSlug,
      name: skillSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    };
    return {
      skill: meta,
      previousLevel: prevLevel,
      proficiency,
      fit: {
        score: 30,
        previousScore: 26,
        band: 'early',
      },
    };
  }
  return api.patch(`/users/me/skills/${encodeURIComponent(skillSlug)}`, { proficiency });
}

export default {
  getMe,
  patchMe,
  getUserSkills,
  putSkills,
  patchSkill,
};
