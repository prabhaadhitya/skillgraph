import { api, USE_MOCKS } from './api.js';
import mockAdminData from '../mocks/admin-analytics.mock.json';

/**
 * Fetch overview totals and metrics.
 * GET /admin/analytics/overview
 */
export async function getOverview() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockAdminData.overview));
  }
  return api.get('/admin/analytics/overview');
}

/**
 * Fetch top skill gaps among students.
 * GET /admin/analytics/skill-gaps?limit=10
 */
export async function getSkillGaps(limit = 10) {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockAdminData.skillGaps));
  }
  return api.get(`/admin/analytics/skill-gaps?limit=${limit}`);
}

/**
 * Fetch student distribution across careers.
 * GET /admin/analytics/career-distribution
 */
export async function getCareerDistribution() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockAdminData.careerDistribution));
  }
  return api.get('/admin/analytics/career-distribution');
}

/**
 * Fetch skill popularity ranked by student count.
 * GET /admin/analytics/skill-popularity?limit=10
 */
export async function getSkillPopularity(limit = 10) {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockAdminData.skillPopularity));
  }
  return api.get(`/admin/analytics/skill-popularity?limit=${limit}`);
}

/**
 * Fetch semester distribution metrics.
 * GET /admin/analytics/semester-distribution
 */
export async function getSemesterDistribution() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockAdminData.semesterDistribution));
  }
  return api.get('/admin/analytics/semester-distribution');
}

/**
 * Fetch ML model information and metrics.
 * GET /admin/ml/info
 * Returns null or { available: false } if the endpoint is not available.
 */
export async function getModelInfo() {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockAdminData.modelInfo));
  }
  try {
    const res = await api.get('/admin/ml/info');
    return res;
  } catch {
    // If endpoint doesn't exist yet, return null so UI can render EmptyState
    return null;
  }
}

export default {
  getOverview,
  getSkillGaps,
  getCareerDistribution,
  getSkillPopularity,
  getSemesterDistribution,
  getModelInfo,
};
