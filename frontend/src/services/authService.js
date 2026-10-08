import { api, USE_MOCKS } from './api.js';

export const MOCK_USER = {
  id: 'usr_mock_prabha_2026',
  name: 'Prabha',
  email: 'prabha@demo.skillgraph.dev',
  role: 'student',
  college: 'Chaitanya Institute of Technology',
  degree: 'B.Tech',
  branch: 'CSE',
  semester: 5,
  targetCareer: {
    id: 'car_mle_2026',
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
  },
  onboardingCompleted: true,
  createdAt: '2026-10-07T08:00:00.000Z',
};

export const MOCK_NEWBIE = {
  id: 'usr_mock_newbie',
  name: 'Newbie',
  email: 'newbie@demo.skillgraph.dev',
  role: 'student',
  college: 'Chaitanya',
  degree: 'B.Tech',
  branch: 'ECE',
  semester: 1,
  targetCareer: null,
  onboardingCompleted: false,
  createdAt: '2026-10-07T08:00:00.000Z',
};

let activeMockUser = MOCK_USER;

export function setActiveMockUser(user) {
  activeMockUser = user;
}

export function getActiveMockUser() {
  return activeMockUser;
}

/**
 * Register a new student account.
 *
 * @param {Object} body
 * @param {string} body.name
 * @param {string} body.email
 * @param {string} body.password
 * @returns {Promise<{ user: Object }>}
 */
export async function register(body) {
  if (USE_MOCKS) {
    activeMockUser = {
      ...MOCK_NEWBIE,
      name: body.name || MOCK_NEWBIE.name,
      email: body.email || MOCK_NEWBIE.email,
      onboardingCompleted: false,
      targetCareer: null,
    };
    return { user: activeMockUser };
  }
  return api.post('/auth/register', body);
}

/**
 * Log in with email and password.
 *
 * @param {Object} body
 * @param {string} body.email
 * @param {string} body.password
 * @returns {Promise<{ user: Object }>}
 */
export async function login(body) {
  if (USE_MOCKS) {
    if (body?.email?.toLowerCase().includes('newbie')) {
      activeMockUser = { ...MOCK_NEWBIE };
    } else {
      activeMockUser = { ...MOCK_USER };
    }
    return { user: activeMockUser };
  }
  return api.post('/auth/login', body);
}

/**
 * Log out and clear authentication cookie.
 *
 * @returns {Promise<{ loggedOut: boolean }>}
 */
export async function logout() {
  if (USE_MOCKS) {
    activeMockUser = null;
    return { loggedOut: true };
  }
  return api.post('/auth/logout');
}

/**
 * Fetch current authenticated user session.
 *
 * @returns {Promise<{ user: Object }>}
 */
export async function me() {
  if (USE_MOCKS) {
    return { user: activeMockUser };
  }
  return api.get('/auth/me');
}

export default {
  register,
  login,
  logout,
  me,
  MOCK_USER,
};
