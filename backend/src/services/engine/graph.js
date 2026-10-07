import { getNodeState } from './nodeState.js';
import { getNextSkills } from './priority.js';

/**
 * Check whether all direct prerequisites for a skill within the career subgraph are satisfied.
 *
 * Definition (see ARCHITECTURE.md §5.2):
 * ready(s) = every direct PREREQUISITE p of s within the career has gap(p) === 0,
 *            i.e. proficiency(p) >= requiredLevel(p).
 * Skills with no prerequisites are always ready.
 *
 * @param {Object} model - Career model
 * @param {Record<string, number>} profile - Student skill proficiencies (slug -> 0..5)
 * @param {string} slug - Target skill slug
 * @returns {boolean}
 */
export function isReady(model, profile, slug) {
  const prereqs = model.directPrereqs.get(slug);
  if (!prereqs || prereqs.length === 0) {
    return true;
  }
  return prereqs.every((pSlug) => {
    const prof = profile[pSlug] ?? 0;
    const req = model.careerSkillMap.get(pSlug)?.requiredLevel ?? 0;
    return prof >= req;
  });
}

/**
 * Build a pure, precomputed career model from skills, relationships, and career requirements.
 *
 * Model contains:
 * - skill info map
 * - importance and required level per skill
 * - direct prerequisites and direct dependents restricted to career skills
 * - descendants transitive closure per skill
 *
 * @param {Object} params
 * @param {string} params.careerSlug - Slug of the career
 * @param {Array<{ slug: string, name: string, category: string, difficulty: number }>} params.skills
 * @param {Array<{ source: string, target: string, type: string }>} params.edges
 * @param {Array<{ skillSlug?: string, skill?: string, importance: number, requiredLevel: number }>} params.careerSkills
 * @returns {Object} Precomputed career model
 */
export function buildCareerModel({ careerSlug, skills, edges, careerSkills }) {
  const skillMap = new Map();
  for (const s of skills || []) {
    skillMap.set(s.slug, s);
  }

  const careerSkillMap = new Map();
  const careerSkillsList = [];
  const careerSlugs = new Set();
  let totalImportance = 0;

  for (const cs of careerSkills || []) {
    const slug = cs.skillSlug || cs.skill;
    if (!slug) continue;
    careerSlugs.add(slug);
    const item = {
      skillSlug: slug,
      importance: cs.importance,
      requiredLevel: cs.requiredLevel,
    };
    careerSkillMap.set(slug, item);
    careerSkillsList.push(item);
    totalImportance += cs.importance;
  }

  const directPrereqs = new Map();
  const directDependents = new Map();
  for (const slug of careerSlugs) {
    directPrereqs.set(slug, []);
    directDependents.set(slug, []);
  }

  for (const e of edges || []) {
    if (e.type === 'PREREQUISITE' && careerSlugs.has(e.source) && careerSlugs.has(e.target)) {
      directPrereqs.get(e.target).push(e.source);
      directDependents.get(e.source).push(e.target);
    }
  }

  const descendants = new Map();
  for (const slug of careerSlugs) {
    const visited = new Set();
    const queue = [...directDependents.get(slug)];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (!visited.has(curr)) {
        visited.add(curr);
        queue.push(...directDependents.get(curr));
      }
    }
    descendants.set(slug, visited);
  }

  return {
    careerSlug,
    skills: skillMap,
    careerSkillMap,
    careerSlugs,
    careerSkillsList,
    directPrereqs,
    directDependents,
    descendants,
    totalImportance,
    edges: edges || [],
  };
}

/**
 * Build graph view payload matching docs/API.md §6 GET /analysis/graph.
 *
 * Rules:
 * - Nodes: state is 'recommended' for top-k next skills, else 'mastered' when gap=0,
 *   else 'partial' when proficiency > 0, else 'missing'.
 * - Edges: PREREQUISITE edges where both ends are in the career; plus RELATED_TO
 *   if includeRelated is true and both ends are in the career.
 * - Stats: { nodes: count, edges: count }.
 *
 * @param {Object} model - Precomputed career graph model
 * @param {Record<string, number>} profile - Student profile
 * @param {Object} [options={}]
 * @param {boolean} [options.includeRelated=false] - Whether to include RELATED_TO edges
 * @param {number} [options.recommendedLimit=3] - Number of recommendations for 'recommended' state
 * @returns {{ nodes: Array<Object>, edges: Array<Object>, stats: { nodes: number, edges: number } }}
 */
export function buildGraphView(
  model,
  profile,
  { includeRelated = false, recommendedLimit = 3 } = {}
) {
  const nextSkills = getNextSkills(model, profile, recommendedLimit);
  const recommendedSlugs = new Set(nextSkills.map((n) => n.skill.slug));

  const nodes = model.careerSkillsList.map((cs) => {
    const slug = cs.skillSlug;
    const skill = model.skills.get(slug);
    const proficiency = profile[slug] ?? 0;
    const requiredLevel = cs.requiredLevel;
    const importance = cs.importance;
    const gap = Math.max(0, requiredLevel - proficiency);

    const isRecommended = recommendedSlugs.has(slug);
    const state = getNodeState({
      gap,
      proficiency,
      isRecommended,
      isRelevant: true,
    });
    const isReadyNow = isReady(model, profile, slug) && gap > 0;

    return {
      id: slug,
      slug,
      name: skill?.name ?? slug,
      category: skill?.category ?? '',
      difficulty: skill?.difficulty ?? 1,
      state,
      proficiency,
      requiredLevel,
      importance,
      isReadyNow,
    };
  });

  const edges = [];
  const edgeKeys = new Set();

  for (const e of model.edges) {
    if (!model.careerSlugs.has(e.source) || !model.careerSlugs.has(e.target)) {
      continue;
    }

    if (e.type === 'PREREQUISITE') {
      const edgeId = `${e.source}>${e.target}`;
      if (!edgeKeys.has(edgeId)) {
        edgeKeys.add(edgeId);
        edges.push({
          id: edgeId,
          source: e.source,
          target: e.target,
          type: 'PREREQUISITE',
        });
      }
    } else if (includeRelated && e.type === 'RELATED_TO') {
      const edgeId = `${e.source}>${e.target}`;
      if (!edgeKeys.has(edgeId)) {
        edgeKeys.add(edgeId);
        edges.push({
          id: edgeId,
          source: e.source,
          target: e.target,
          type: 'RELATED_TO',
        });
      }
    }
  }

  return {
    nodes,
    edges,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
    },
  };
}

export default {
  buildCareerModel,
  isReady,
  buildGraphView,
};
