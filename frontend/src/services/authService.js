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
    return { user: { ...MOCK_USER, name: body.name || MOCK_USER.name, email: body.email || MOCK_USER.email, onboardingCompleted: false, targetCareer: null } };
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
    return { user: MOCK_USER };
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
    return { user: MOCK_USER };
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
