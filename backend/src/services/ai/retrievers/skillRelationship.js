import {
  getLevelLabel,
  resolveUserTargetCareerSlug,
  getCareerModelSafe,
  isSkillSlugAllowed,
  getSkillData,
} from './helpers.js';

/**
 * Finds a directed path of prerequisite relationships from startSlug to targetSlug.
 *
 * @param {string} startSlug
 * @param {string} targetSlug
 * @param {Object} model
 * @returns {Array<string>|null}
 */
function findDirectedPath(startSlug, targetSlug, model) {
  if (!model?.directDependents) return null;

  const queue = [[startSlug]];
  const visited = new Set([startSlug]);

  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1];

    if (curr === targetSlug) {
      return path;
    }

    const neighbors = model.directDependents instanceof Map
      ? model.directDependents.get(curr) || []
      : [];

    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...path, n]);
      }
    }
  }

  return null;
}

/**
 * Fact retriever for intent: "skill_relationship".
 * Explains how two skills connect in the graph (prerequisite, unlocks, related, or none).
 *
 * @param {Object} deps - Injected dependencies
 * @param {string} userId - Caller user ID
 * @param {Object} params - Intent parameters { skillSlug: string, otherSkillSlug?: string, careerSlug?: string }
 * @returns {Promise<{ facts: Object, grounding: { skills: string[], careers: string[] } } | { needsClarification: true }>}
 */
export async function retrieveSkillRelationship(deps, userId, params = {}) {
  try {
    const skillSlug = params?.skillSlug;
    if (!skillSlug || typeof skillSlug !== 'string' || !skillSlug.trim()) {
      return { needsClarification: true };
    }

    const otherSkillSlug = params?.otherSkillSlug;
    if (otherSkillSlug !== undefined && (typeof otherSkillSlug !== 'string' || !otherSkillSlug.trim())) {
      return { needsClarification: true };
    }

    const careerSlug = await resolveUserTargetCareerSlug(deps, userId, params?.careerSlug);
    const careerData = careerSlug ? await getCareerModelSafe(deps, careerSlug) : null;
    const model = careerData?.model;

    // Validate skillSlug against allow-list
    const isSkillAllowed = await isSkillSlugAllowed(deps, skillSlug, model);
    if (!isSkillAllowed) {
      return { needsClarification: true };
    }

    // Validate otherSkillSlug against allow-list if supplied
    if (otherSkillSlug) {
      const isOtherAllowed = await isSkillSlugAllowed(deps, otherSkillSlug, model);
      if (!isOtherAllowed) {
        return { needsClarification: true };
      }
    }

    // Read only caller's profile
    const profile = (await deps.profileService?.getProfileMap(userId)) || {};

    const skillData = getSkillData(model, skillSlug);
    let resolvedOtherSlug = otherSkillSlug;

    // If otherSkillSlug was not provided, pick the first unlock, prerequisite, or related skill
    if (!resolvedOtherSlug && model) {
      const unlocks = model.directDependents instanceof Map ? model.directDependents.get(skillSlug) || [] : [];
      const prereqs = model.directPrereqs instanceof Map ? model.directPrereqs.get(skillSlug) || [] : [];

      if (unlocks.length > 0) {
        resolvedOtherSlug = unlocks[0];
      } else if (prereqs.length > 0) {
        resolvedOtherSlug = prereqs[0];
      } else if (Array.isArray(model.edges)) {
        const edge = model.edges.find((e) => (e.source === skillSlug || e.target === skillSlug) && e.type === 'RELATED_TO');
        if (edge) {
          resolvedOtherSlug = edge.source === skillSlug ? edge.target : edge.source;
        }
      }
    }

    const otherData = resolvedOtherSlug
      ? getSkillData(model, resolvedOtherSlug)
      : { slug: 'unknown', name: 'Other Skill' };

    let relation = 'none';
    let pathBetweenNames = [];
    let pathBetweenSlugs = [];

    if (model && resolvedOtherSlug) {
      // Check if skillSlug is prerequisite for resolvedOtherSlug
      const pathToOther = findDirectedPath(skillSlug, resolvedOtherSlug, model);
      if (pathToOther && pathToOther.length > 1) {
        relation = 'prerequisite';
        pathBetweenSlugs = pathToOther;
        pathBetweenNames = pathToOther.map((s) => getSkillData(model, s).name);
      } else {
        // Check if resolvedOtherSlug is prerequisite for skillSlug (i.e. skillSlug is unlocked by other)
        const pathFromOther = findDirectedPath(resolvedOtherSlug, skillSlug, model);
        if (pathFromOther && pathFromOther.length > 1) {
          relation = 'unlocks';
          pathBetweenSlugs = pathFromOther;
          pathBetweenNames = pathFromOther.map((s) => getSkillData(model, s).name);
        } else {
          // Check if RELATED_TO edge connects them
          const isRelated = Array.isArray(model.edges) && model.edges.some(
            (e) =>
              e.type === 'RELATED_TO' &&
              ((e.source === skillSlug && e.target === resolvedOtherSlug) ||
                (e.source === resolvedOtherSlug && e.target === skillSlug)),
          );
          if (isRelated) {
            relation = 'related';
          }
        }
      }
    }

    const unlocksSlugs = model?.directDependents instanceof Map
      ? model.directDependents.get(skillSlug) || []
      : [];
    const prereqsSlugs = model?.directPrereqs instanceof Map
      ? model.directPrereqs.get(skillSlug) || []
      : [];

    const prerequisites = prereqsSlugs.map((pSlug) => {
      const pSkill = getSkillData(model, pSlug);
      const pProf = profile[pSlug] ?? 0;
      return {
        slug: pSlug,
        name: pSkill.name || pSlug,
        proficiency: pProf,
        levelLabel: getLevelLabel(pProf),
      };
    });

    const unlocks = unlocksSlugs.map((uSlug) => {
      const uSkill = getSkillData(model, uSlug);
      const uProf = profile[uSlug] ?? 0;
      return {
        slug: uSlug,
        name: uSkill.name || uSlug,
        proficiency: uProf,
        levelLabel: getLevelLabel(uProf),
      };
    });

    const facts = {
      skill: {
        slug: skillData.slug,
        name: skillData.name,
      },
      other: resolvedOtherSlug
        ? {
            slug: otherData.slug,
            name: otherData.name,
          }
        : null,
      relation,
      pathBetween: pathBetweenNames,
      prerequisites,
      unlocks,
      youKnow: {
        skill: getLevelLabel(profile[skillSlug] ?? 0),
        other: resolvedOtherSlug ? getLevelLabel(profile[resolvedOtherSlug] ?? 0) : null,
      },
    };

    const grounding = {
      skills: Array.from(
        new Set([skillSlug, resolvedOtherSlug, ...pathBetweenSlugs, ...prereqsSlugs, ...unlocksSlugs]),
      ).filter((s) => s && s !== 'unknown'),
      careers: careerData?.career?.slug ? [careerData.career.slug] : [],
    };

    return { facts, grounding };
  } catch {
    return { needsClarification: true };
  }
}

export default retrieveSkillRelationship;
