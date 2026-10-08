import { api, USE_MOCKS, ApiError } from './api.js';
import mockSkillsData from '../mocks/skills.mock.json';
import mockCareersData from '../mocks/careers.mock.json';
import mockCareerSkillsData from '../mocks/career-skills.mock.json';
import mockRelationshipsData from '../mocks/relationships.mock.json';

// In-memory mutable states for mock mode
let inMemorySkills = JSON.parse(JSON.stringify(mockSkillsData));
let inMemoryCareers = JSON.parse(JSON.stringify(mockCareersData));
let inMemoryCareerSkills = JSON.parse(JSON.stringify(mockCareerSkillsData));
let inMemoryRelationships = mockRelationshipsData.map((r, idx) => ({
  id: `mock-rel-${idx + 1}`,
  source: r.source,
  target: r.target,
  type: r.type,
  strength: r.strength || 1,
}));

function findMockCycle(edges) {
  const adj = new Map();
  const nodes = new Set();
  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) continue;
    nodes.add(edge.source);
    nodes.add(edge.target);
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source).push(edge.target);
  }

  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        return [...path.slice(cycleStartIndex), neighbor];
      }
    }

    path.pop();
    recursionStack.delete(node);
    return null;
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      const cycle = dfs(node);
      if (cycle) return cycle;
    }
  }
  return null;
}

// =============================================================================
// SKILLS
// =============================================================================

export async function createSkill(skillData) {
  if (USE_MOCKS) {
    const existing = inMemorySkills.find((s) => s.slug === skillData.slug);
    if (existing) {
      throw new ApiError(409, 'CONFLICT', `Skill with slug '${skillData.slug}' already exists`);
    }
    const newSkill = { ...skillData };
    inMemorySkills.push(newSkill);
    return { skill: newSkill };
  }
  const res = await api.post('/admin/skills', skillData);
  return res.data || res;
}

export async function updateSkill(slug, updateData) {
  if (USE_MOCKS) {
    const idx = inMemorySkills.findIndex((s) => s.slug === slug);
    if (idx === -1) {
      throw new ApiError(404, 'NOT_FOUND', `Skill '${slug}' not found`);
    }
    inMemorySkills[idx] = { ...inMemorySkills[idx], ...updateData, slug };
    return { skill: inMemorySkills[idx] };
  }
  const res = await api.patch(`/admin/skills/${encodeURIComponent(slug)}`, updateData);
  return res.data || res;
}

export async function deleteSkill(slug) {
  if (USE_MOCKS) {
    const skill = inMemorySkills.find((s) => s.slug === slug);
    if (!skill) {
      throw new ApiError(404, 'NOT_FOUND', `Skill '${slug}' not found`);
    }
    const relCount = inMemoryRelationships.filter(
      (r) => r.source === slug || r.target === slug,
    ).length;
    const careerCount = inMemoryCareerSkills.filter((cs) => cs.skill === slug).length;

    if (relCount > 0 || careerCount > 0) {
      throw new ApiError(
        409,
        'CONFLICT',
        `Cannot delete skill '${slug}': it is referenced by ${relCount} relationship(s) and ${careerCount} career(s)`,
      );
    }
    inMemorySkills = inMemorySkills.filter((s) => s.slug !== slug);
    return { deleted: true, slug };
  }
  const res = await api.delete(`/admin/skills/${encodeURIComponent(slug)}`);
  return res.data || res;
}

// =============================================================================
// RELATIONSHIPS
// =============================================================================

export async function getRelationships(skillSlug) {
  if (USE_MOCKS) {
    let rels = inMemoryRelationships;
    if (skillSlug) {
      rels = rels.filter((r) => r.source === skillSlug || r.target === skillSlug);
    }
    const skillMap = new Map(inMemorySkills.map((s) => [s.slug, s]));

    const items = rels.map((r) => {
      const srcMeta = skillMap.get(r.source) || { slug: r.source, name: r.source };
      const tgtMeta = skillMap.get(r.target) || { slug: r.target, name: r.target };
      return {
        id: r.id,
        source: srcMeta,
        target: tgtMeta,
        type: r.type,
        strength: r.strength,
      };
    });
    return { items };
  }
  const qs = skillSlug ? `?skill=${encodeURIComponent(skillSlug)}` : '';
  const res = await api.get(`/admin/relationships${qs}`);
  return res.data || res;
}

export async function createRelationship({ source, target, type, strength = 1 }) {
  if (USE_MOCKS) {
    if (source === target) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Source and target cannot be the same skill');
    }
    const src = inMemorySkills.find((s) => s.slug === source);
    const tgt = inMemorySkills.find((s) => s.slug === target);
    if (!src) throw new ApiError(404, 'NOT_FOUND', `Skill '${source}' not found`);
    if (!tgt) throw new ApiError(404, 'NOT_FOUND', `Skill '${target}' not found`);

    if (type === 'PREREQUISITE') {
      const prereqs = inMemoryRelationships.filter((r) => r.type === 'PREREQUISITE');
      const candidateEdges = [
        ...prereqs.map((r) => ({ source: r.source, target: r.target })),
        { source, target },
      ];
      const cycle = findMockCycle(candidateEdges);
      if (cycle) {
        const skillNameMap = new Map(inMemorySkills.map((s) => [s.slug, s.name]));
        const cycleNames = cycle.map((slug) => skillNameMap.get(slug) || slug);
        throw new ApiError(
          422,
          'RULE_VIOLATION',
          `That would create a loop: ${cycleNames.join(' -> ')}`,
        );
      }
    }

    const newRel = {
      id: `mock-rel-${Date.now()}`,
      source,
      target,
      type,
      strength,
    };
    inMemoryRelationships.push(newRel);
    return { relationship: newRel };
  }
  const res = await api.post('/admin/relationships', { source, target, type, strength });
  return res.data || res;
}

export async function deleteRelationship(id) {
  if (USE_MOCKS) {
    inMemoryRelationships = inMemoryRelationships.filter((r) => r.id !== id);
    return { deleted: true, id };
  }
  const res = await api.delete(`/admin/relationships/${encodeURIComponent(id)}`);
  return res.data || res;
}

// =============================================================================
// CAREERS
// =============================================================================

export async function getCareers() {
  if (USE_MOCKS) {
    return inMemoryCareers;
  }
  const res = await api.get('/careers');
  return Array.isArray(res) ? res : res?.items || [];
}

export async function createCareer(careerData) {
  if (USE_MOCKS) {
    const existing = inMemoryCareers.find((c) => c.slug === careerData.slug);
    if (existing) {
      throw new ApiError(409, 'CONFLICT', `Career with slug '${careerData.slug}' already exists`);
    }
    const newCareer = { ...careerData, isActive: true };
    inMemoryCareers.push(newCareer);
    return { career: newCareer };
  }
  const res = await api.post('/admin/careers', careerData);
  return res.data || res;
}

export async function updateCareer(slug, patchData) {
  if (USE_MOCKS) {
    const idx = inMemoryCareers.findIndex((c) => c.slug === slug);
    if (idx === -1) {
      throw new ApiError(404, 'NOT_FOUND', `Career '${slug}' not found`);
    }
    inMemoryCareers[idx] = { ...inMemoryCareers[idx], ...patchData, slug };
    return { career: inMemoryCareers[idx] };
  }
  const res = await api.patch(`/admin/careers/${encodeURIComponent(slug)}`, patchData);
  return res.data || res;
}

export async function updateCareerSkills(slug, skills) {
  if (USE_MOCKS) {
    const prereqEdges = inMemoryRelationships.filter((r) => r.type === 'PREREQUISITE');
    const prereqsByTarget = new Map();
    for (const rel of prereqEdges) {
      if (!prereqsByTarget.has(rel.target)) prereqsByTarget.set(rel.target, []);
      prereqsByTarget.get(rel.target).push(rel.source);
    }

    const proposedSlugs = new Set(skills.map((s) => s.skillSlug));
    const missingDetails = [];
    for (const cs of skills) {
      const directPrereqs = prereqsByTarget.get(cs.skillSlug) || [];
      for (const p of directPrereqs) {
        if (!proposedSlugs.has(p)) {
          missingDetails.push({
            missingSkillSlug: p,
            requiredBySkillSlug: cs.skillSlug,
            message: `Skill '${cs.skillSlug}' requires prerequisite '${p}'`,
          });
        }
      }
    }

    if (missingDetails.length > 0) {
      throw new ApiError(
        422,
        'RULE_VIOLATION',
        'Career skills violate prerequisite closure rules',
        missingDetails,
      );
    }

    // Replace in-memory career skills
    inMemoryCareerSkills = inMemoryCareerSkills.filter((cs) => cs.career !== slug);
    for (const s of skills) {
      inMemoryCareerSkills.push({
        career: slug,
        skill: s.skillSlug,
        importance: s.importance,
        requiredLevel: s.requiredLevel,
      });
    }

    return { career: inMemoryCareers.find((c) => c.slug === slug), skills };
  }
  const res = await api.put(`/admin/careers/${encodeURIComponent(slug)}/skills`, { skills });
  return res.data || res;
}

export default {
  createSkill,
  updateSkill,
  deleteSkill,
  getRelationships,
  createRelationship,
  deleteRelationship,
  getCareers,
  createCareer,
  updateCareer,
  updateCareerSkills,
};
