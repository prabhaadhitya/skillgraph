/**
 * Detects a cycle in a directed graph of edges.
 *
 * @param {Array<{ source: string, target: string }>} edges - Directed edges
 * @returns {string[] | null} Cycle path (e.g. ['a', 'b', 'c', 'a']) or null if acyclic.
 */
export function findCycle(edges) {
  const adj = new Map();
  const nodes = new Set();

  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) continue;
    nodes.add(edge.source);
    nodes.add(edge.target);
    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
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

const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validates the knowledge base seed data against rules V1 to V11 in docs/DATABASE.md §6.
 * Pure function: never throws, returns collected errors and warnings.
 *
 * @param {{
 *   skills?: Array<{ slug: string, name: string, description?: string, category?: string, difficulty?: number }>,
 *   relationships?: Array<{ source: string, target: string, type: string, strength?: number }>,
 *   careers?: Array<{ slug: string, name: string, description?: string, category?: string, icon?: string }>,
 *   careerSkills?: Array<{ career: string, skill: string, importance: number, requiredLevel: number }>
 * }} seed - Loaded seed collections
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateSeed({
  skills = [],
  relationships = [],
  careers = [],
  careerSkills = [],
} = {}) {
  const errors = [];
  const warnings = [];

  // =========================================================================
  // V1: Skill/career slugs are unique and kebab-case
  // =========================================================================
  const seenSkillSlugs = new Set();
  for (const skill of skills) {
    if (!skill?.slug || !KEBAB_CASE_REGEX.test(skill.slug)) {
      errors.push(`V1 slug format: skill slug '${skill?.slug}' is not valid kebab-case`);
    }
    if (skill?.slug && seenSkillSlugs.has(skill.slug)) {
      errors.push(`V1 duplicate slug: duplicate skill slug '${skill.slug}'`);
    } else if (skill?.slug) {
      seenSkillSlugs.add(skill.slug);
    }
  }

  const seenCareerSlugs = new Set();
  for (const career of careers) {
    if (!career?.slug || !KEBAB_CASE_REGEX.test(career.slug)) {
      errors.push(`V1 slug format: career slug '${career?.slug}' is not valid kebab-case`);
    }
    if (career?.slug && seenCareerSlugs.has(career.slug)) {
      errors.push(`V1 duplicate slug: duplicate career slug '${career.slug}'`);
    } else if (career?.slug) {
      seenCareerSlugs.add(career.slug);
    }
  }

  // =========================================================================
  // V2: Every referenced slug exists
  // =========================================================================
  for (const rel of relationships) {
    if (!seenSkillSlugs.has(rel?.source)) {
      errors.push(`V2 unknown slug: relationship source '${rel?.source}' does not exist in skills`);
    }
    if (!seenSkillSlugs.has(rel?.target)) {
      errors.push(`V2 unknown slug: relationship target '${rel?.target}' does not exist in skills`);
    }
  }

  for (const cs of careerSkills) {
    if (!seenCareerSlugs.has(cs?.career)) {
      errors.push(`V2 unknown slug: careerSkill career '${cs?.career}' does not exist in careers`);
    }
    if (!seenSkillSlugs.has(cs?.skill)) {
      errors.push(`V2 unknown slug: careerSkill skill '${cs?.skill}' does not exist in skills`);
    }
  }

  // =========================================================================
  // V3: PREREQUISITE graph has no self-loops and no cycles
  // =========================================================================
  const prereqEdges = relationships.filter((rel) => rel?.type === 'PREREQUISITE');

  for (const rel of prereqEdges) {
    if (rel.source === rel.target) {
      errors.push(`V3 self-loop: prerequisite self-loop detected for skill '${rel.source}'`);
    }
  }

  const cycle = findCycle(prereqEdges);
  if (cycle) {
    errors.push(`V3 cycle: prerequisite cycle detected: ${cycle.join(' -> ')}`);
  }

  // =========================================================================
  // V4: importance in [0,1], requiredLevel in 1..5, difficulty in 1..5, strength in [0,1]
  // =========================================================================
  for (const skill of skills) {
    const diff = skill?.difficulty;
    if (typeof diff !== 'number' || !Number.isInteger(diff) || diff < 1 || diff > 5) {
      errors.push(
        `V4 range: skill '${skill?.slug}' has invalid difficulty ${diff} (expected integer 1..5)`,
      );
    }
  }

  for (const rel of relationships) {
    if (rel?.strength !== undefined && rel?.strength !== null) {
      const str = rel.strength;
      if (typeof str !== 'number' || str < 0 || str > 1) {
        errors.push(
          `V4 range: relationship '${rel.source}' -> '${rel.target}' has invalid strength ${str} (expected 0..1)`,
        );
      }
    }
  }

  for (const cs of careerSkills) {
    const imp = cs?.importance;
    if (typeof imp !== 'number' || imp < 0 || imp > 1) {
      errors.push(
        `V4 range: career '${cs?.career}', skill '${cs?.skill}' has invalid importance ${imp} (expected 0..1)`,
      );
    }

    const reqLvl = cs?.requiredLevel;
    if (typeof reqLvl !== 'number' || !Number.isInteger(reqLvl) || reqLvl < 1 || reqLvl > 5) {
      errors.push(
        `V4 range: career '${cs?.career}', skill '${cs?.skill}' has invalid requiredLevel ${reqLvl} (expected integer 1..5)`,
      );
    }
  }

  // Map career slug -> Map<skillSlug, careerSkill>
  const careerSkillMapByCareer = new Map();
  for (const career of careers) {
    careerSkillMapByCareer.set(career.slug, new Map());
  }
  for (const cs of careerSkills) {
    if (careerSkillMapByCareer.has(cs.career)) {
      careerSkillMapByCareer.get(cs.career).set(cs.skill, cs);
    }
  }

  // Pre-index prerequisite edges: target -> list of sources
  const prereqsByTarget = new Map();
  for (const rel of prereqEdges) {
    if (!prereqsByTarget.has(rel.target)) {
      prereqsByTarget.set(rel.target, []);
    }
    prereqsByTarget.get(rel.target).push(rel.source);
  }

  // =========================================================================
  // V5: Closure: for each career, every direct prerequisite of a career skill is also a skill of that career
  // =========================================================================
  for (const career of careers) {
    const skillMap = careerSkillMapByCareer.get(career.slug);
    if (!skillMap) continue;

    for (const skillSlug of skillMap.keys()) {
      const directPrereqs = prereqsByTarget.get(skillSlug) || [];
      for (const prereq of directPrereqs) {
        if (!skillMap.has(prereq)) {
          errors.push(
            `V5 closure: career ${career.slug}: skill ${skillSlug} needs prerequisite ${prereq}`,
          );
        }
      }
    }
  }

  // =========================================================================
  // V6: A skill that is a prerequisite of another skill in the career has requiredLevel >= 2 there
  // =========================================================================
  for (const career of careers) {
    const skillMap = careerSkillMapByCareer.get(career.slug);
    if (!skillMap) continue;

    for (const [skillSlug, cs] of skillMap.entries()) {
      // Check if skillSlug is a prerequisite for any other skill in this same career
      let isPrereqOfAnotherCareerSkill = false;
      for (const otherSkillSlug of skillMap.keys()) {
        if (otherSkillSlug === skillSlug) continue;
        const otherPrereqs = prereqsByTarget.get(otherSkillSlug) || [];
        if (otherPrereqs.includes(skillSlug)) {
          isPrereqOfAnotherCareerSkill = true;
          break;
        }
      }

      if (isPrereqOfAnotherCareerSkill && cs.requiredLevel < 2) {
        errors.push(
          `V6 prerequisite level: career ${career.slug}: prerequisite skill ${skillSlug} has requiredLevel ${cs.requiredLevel} (expected >= 2)`,
        );
      }
    }
  }

  // =========================================================================
  // V7: No duplicate (career, skill) or duplicate relationship
  // =========================================================================
  const seenCareerSkillPairs = new Set();
  for (const cs of careerSkills) {
    const key = `${cs?.career}::${cs?.skill}`;
    if (seenCareerSkillPairs.has(key)) {
      errors.push(`V7 duplicate: duplicate career skill (${cs?.career}, ${cs?.skill})`);
    } else {
      seenCareerSkillPairs.add(key);
    }
  }

  const seenRelationships = new Set();
  for (const rel of relationships) {
    const key = `${rel?.source}::${rel?.target}::${rel?.type}`;
    if (seenRelationships.has(key)) {
      errors.push(
        `V7 duplicate: duplicate relationship (${rel?.source} -> ${rel?.target}, ${rel?.type})`,
      );
    } else {
      seenRelationships.add(key);
    }
  }

  // =========================================================================
  // V8: No RELATED_TO duplicate in reverse order
  // =========================================================================
  const seenRelatedPairs = new Set();
  for (const rel of relationships) {
    if (rel?.type === 'RELATED_TO') {
      const reverseKey = `${rel?.target}::${rel?.source}`;
      if (seenRelatedPairs.has(reverseKey)) {
        errors.push(
          `V8 related reverse duplicate: RELATED_TO edge (${rel?.source}, ${rel?.target}) already exists in reverse order`,
        );
      }
      seenRelatedPairs.add(`${rel?.source}::${rel?.target}`);
    }
  }

  // =========================================================================
  // V9: Orphan skills (in no relationship and no career) -> WARNING
  // =========================================================================
  const activeSkills = new Set();
  for (const rel of relationships) {
    if (rel?.source) activeSkills.add(rel.source);
    if (rel?.target) activeSkills.add(rel.target);
  }
  for (const cs of careerSkills) {
    if (cs?.skill) activeSkills.add(cs.skill);
  }

  for (const skill of skills) {
    if (skill?.slug && !activeSkills.has(skill.slug)) {
      warnings.push(
        `V9 orphan skill: skill '${skill.slug}' is not used in any relationship or career`,
      );
    }
  }

  // =========================================================================
  // V10: Each career has >= 15 skills and at least one skill with importance 1.0 -> WARNING
  // =========================================================================
  for (const career of careers) {
    const careerSkillsList = careerSkills.filter((cs) => cs?.career === career?.slug);

    if (careerSkillsList.length < 15) {
      warnings.push(
        `V10 career skill count: career '${career.slug}' has only ${careerSkillsList.length} skills (expected >= 15)`,
      );
    }

    const hasImportanceOne = careerSkillsList.some((cs) => cs?.importance === 1.0 || cs?.importance >= 1);
    if (!hasImportanceOne) {
      warnings.push(
        `V10 career importance: career '${career.slug}' has no skill with importance 1.0`,
      );
    }
  }

  // =========================================================================
  // V11: Longest prerequisite chain <= 6 edges -> WARNING
  // Count the longest chain in EDGES (links), not nodes.
  // =========================================================================
  if (!cycle) {
    const prereqAdj = new Map();
    for (const rel of prereqEdges) {
      if (!prereqAdj.has(rel.source)) {
        prereqAdj.set(rel.source, []);
      }
      prereqAdj.get(rel.source).push(rel.target);
    }

    const memo = new Map();
    function getLongestEdgeChain(node) {
      if (memo.has(node)) return memo.get(node);
      const neighbors = prereqAdj.get(node) || [];
      let maxEdges = 0;
      for (const neighbor of neighbors) {
        maxEdges = Math.max(maxEdges, 1 + getLongestEdgeChain(neighbor));
      }
      memo.set(node, maxEdges);
      return maxEdges;
    }

    let globalMaxEdges = 0;
    for (const skill of skills) {
      if (skill?.slug) {
        globalMaxEdges = Math.max(globalMaxEdges, getLongestEdgeChain(skill.slug));
      }
    }

    if (globalMaxEdges > 6) {
      warnings.push(
        `V11 chain length: longest prerequisite chain has ${globalMaxEdges} edges (expected <= 6)`,
      );
    }
  }

  return { errors, warnings };
}

export default validateSeed;
