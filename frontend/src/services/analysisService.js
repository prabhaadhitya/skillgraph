import { api, USE_MOCKS } from './api.js';
import mockGraphData from '../mocks/graph.prabha.json';
import mockLearningPathData from '../mocks/learning-path.prabha.json';

/**
 * Fetch skill graph data for a target career.
 *
 * @param {string} [career] - Target career slug (omitted to use user's target)
 * @param {object} [options={}] - Query options
 * @param {boolean} [options.includeRelated=false] - Whether to include related edges
 * @returns {Promise<object>} Graph payload { career, nodes, edges, stats }
 */
export async function getGraph(career, options = {}) {
  const { includeRelated = false } = options;

  if (USE_MOCKS) {
    const data = JSON.parse(JSON.stringify(mockGraphData));
    if (!includeRelated) {
      data.edges = data.edges.filter(
        (edge) => edge.type !== 'RELATED_TO' && edge.type !== 'RELATED',
      );
    }
    return data;
  }

  const params = new URLSearchParams();
  if (career) params.append('career', career);
  if (includeRelated) {
    params.append('related', 'true');
    params.append('includeRelated', 'true');
  }
  const qs = params.toString();
  return api.get(`/analysis/graph${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch ordered learning path for a target career.
 *
 * @param {string} [career] - Target career slug (omitted to use user's target)
 * @returns {Promise<object>} Learning path payload { career, totalSteps, totalEffortPoints, steps }
 */
export async function getLearningPath(career) {
  if (USE_MOCKS) {
    return JSON.parse(JSON.stringify(mockLearningPathData));
  }

  const params = new URLSearchParams();
  if (career) params.append('career', career);
  const qs = params.toString();
  return api.get(`/analysis/learning-path${qs ? `?${qs}` : ''}`);
}

/**
 * Update proficiency for a specific skill.
 *
 * @param {string} skillSlug - Skill slug to update
 * @param {number} proficiency - New level (0-5)
 * @returns {Promise<object>} { skill, previousLevel, proficiency, fit: { score, previousScore, band } }
 */
export async function updateSkill(skillSlug, proficiency) {
  if (USE_MOCKS) {
    const formattedName = skillSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      skill: {
        slug: skillSlug,
        name: formattedName,
      },
      previousLevel: 1,
      proficiency,
      fit: {
        score: 65,
        previousScore: 61,
        band: 'developing',
      },
    };
  }

  return api.patch(`/users/me/skills/${encodeURIComponent(skillSlug)}`, {
    proficiency,
  });
}

/**
 * Fetch detailed skill info including prerequisites, unlocks, and target career requirements.
 *
 * @param {string} slug - Skill slug
 * @returns {Promise<object>} Skill detail payload
 */
export async function getSkillDetail(slug) {
  if (USE_MOCKS) {
    const node = mockGraphData.nodes.find(
      (n) => n.slug === slug || n.id === slug,
    );
    const name =
      node?.name ||
      slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const prerequisites = mockGraphData.edges
      .filter(
        (e) => e.target === slug && (e.type === 'PREREQUISITE' || !e.type),
      )
      .map((e) => {
        const prereq = mockGraphData.nodes.find((n) => n.id === e.source);
        return {
          slug: e.source,
          name: prereq?.name || e.source,
          category: prereq?.category || 'general',
        };
      });

    const unlocks = mockGraphData.edges
      .filter(
        (e) => e.source === slug && (e.type === 'PREREQUISITE' || !e.type),
      )
      .map((e) => {
        const unlocked = mockGraphData.nodes.find((n) => n.id === e.target);
        return {
          slug: e.target,
          name: unlocked?.name || e.target,
          category: unlocked?.category || 'general',
        };
      });

    const related = mockGraphData.edges
      .filter(
        (e) =>
          (e.source === slug || e.target === slug) &&
          (e.type === 'RELATED_TO' || e.type === 'RELATED'),
      )
      .map((e) => {
        const otherId = e.source === slug ? e.target : e.source;
        const other = mockGraphData.nodes.find((n) => n.id === otherId);
        return {
          slug: otherId,
          name: other?.name || otherId,
          category: other?.category || 'general',
        };
      });

    return {
      skill: {
        id: slug,
        slug,
        name,
        description: `Core theoretical concepts, industry best practices, and practical implementation for ${name}.`,
        category: node?.category || 'data-analytics',
        difficulty: node?.difficulty || 3,
      },
      prerequisites,
      unlocks,
      related,
      requiredFor: [
        {
          career: {
            slug: 'machine-learning-engineer',
            name: 'Machine Learning Engineer',
          },
          importance: node?.importance || 0.8,
          importanceLabel: (node?.importance || 0.8) >= 0.8 ? 'High' : 'Medium',
          requiredLevel: node?.requiredLevel || 4,
        },
      ],
      you: {
        proficiency: node?.proficiency ?? 1,
        levelLabel: 'Beginner',
        status:
          node?.state === 'missing' ? 'critical' : node?.state || 'developing',
        targetRequiredLevel: node?.requiredLevel || 4,
      },
    };
  }

  return api.get(`/skills/${encodeURIComponent(slug)}`);
}

export default {
  getGraph,
  getLearningPath,
  updateSkill,
  getSkillDetail,
};
