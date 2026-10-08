import { api, USE_MOCKS } from './api.js';
import mockCompareData from '../mocks/career-compare.mock.json';
import mockWhatIfData from '../mocks/what-if.mock.json';

const MOCK_CAREER_FITS = {
  'machine-learning-engineer': { fitScore: 61, coverage: 0.58, readiness: 0.72, band: 'developing' },
  'data-scientist': { fitScore: 74, coverage: 0.72, readiness: 0.81, band: 'strong' },
  'software-developer': { fitScore: 45, coverage: 0.42, readiness: 0.55, band: 'developing' },
  'data-analyst': { fitScore: 50, coverage: 0.48, readiness: 0.60, band: 'developing' },
  'cloud-devops-engineer': { fitScore: 35, coverage: 0.30, readiness: 0.45, band: 'early' },
};

/**
 * Fetch career alignment score for a given career.
 * GET /analysis/career-fit?career=<slug>
 *
 * @param {string} careerSlug
 * @returns {Promise<{ fitScore: number, coverage: number, readiness: number, band: string }>}
 */
export async function getCareerFit(careerSlug) {
  if (USE_MOCKS) {
    return MOCK_CAREER_FITS[careerSlug] || {
      fitScore: 50,
      coverage: 0.48,
      readiness: 0.55,
      band: 'developing',
    };
  }
  return api.get(`/analysis/career-fit?career=${encodeURIComponent(careerSlug)}`);
}

/**
 * Compare two careers (A vs B).
 * GET /analysis/career-compare?a=<slug>&b=<slug>
 *
 * @param {string} a - Career A slug
 * @param {string} b - Career B slug
 * @returns {Promise<Object>}
 */
export async function compareCareers(a, b) {
  if (USE_MOCKS) {
    const data = JSON.parse(JSON.stringify(mockCompareData));
    data.a.career.slug = a;
    data.a.career.name = a.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    data.a.fitScore = MOCK_CAREER_FITS[a]?.fitScore || 65;

    data.b.career.slug = b;
    data.b.career.name = b.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    data.b.fitScore = MOCK_CAREER_FITS[b]?.fitScore || 55;

    return data;
  }
  return api.get(`/analysis/career-compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
}

/**
 * Run what-if simulation for an alternative career.
 * POST /analysis/what-if
 *
 * @param {string} careerSlug
 * @returns {Promise<Object>}
 */
export async function runWhatIf(careerSlug) {
  if (USE_MOCKS) {
    const data = JSON.parse(JSON.stringify(mockWhatIfData));
    data.alternative.career.slug = careerSlug;
    data.alternative.career.name = careerSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    data.alternative.fitScore = MOCK_CAREER_FITS[careerSlug]?.fitScore || 70;
    data.delta = data.alternative.fitScore - data.current.fitScore;
    return data;
  }
  return api.post('/analysis/what-if', { careerSlug });
}

export default {
  getCareerFit,
  compareCareers,
  runWhatIf,
};
