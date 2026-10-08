/**
 * Pure function: Compare two careers (A and B).
 *
 * Requirements:
 * - Returns { onlyA, common, onlyB } with importance on each side.
 * - E16 invariant: common + onlyA = career A skills, common + onlyB = career B skills.
 *
 * @param {Object} modelA - Career A model
 * @param {Object} modelB - Career B model
 * @returns {{
 *   onlyA: Array<{ slug: string, skill: Object, importance: number, requiredLevel: number, importanceA: number }>,
 *   common: Array<{
 *     slug: string,
 *     skill: Object,
 *     importanceA: number,
 *     importanceB: number,
 *     requiredLevelA: number,
 *     requiredLevelB: number,
 *     a: { importance: number, requiredLevel: number },
 *     b: { importance: number, requiredLevel: number }
 *   }>,
 *   onlyB: Array<{ slug: string, skill: Object, importance: number, requiredLevel: number, importanceB: number }>
 * }}
 */
export function compareCareers(modelA, modelB) {
  if (!modelA || !modelB) {
    throw new Error('Both modelA and modelB are required for compareCareers');
  }

  const mapA = modelA.careerSkillMap || new Map();
  const mapB = modelB.careerSkillMap || new Map();

  const skillsA = modelA.skills || new Map();
  const skillsB = modelB.skills || new Map();

  const onlyA = [];
  const common = [];
  const onlyB = [];

  // Iterate over skills in career A
  for (const csA of modelA.careerSkillsList || []) {
    const slug = csA.skillSlug;
    const skillA = skillsA.get(slug) || { slug, name: slug };
    const csB = mapB.get(slug);

    if (csB) {
      // Common to both careers
      common.push({
        slug,
        skill: skillA,
        importanceA: csA.importance,
        importanceB: csB.importance,
        requiredLevelA: csA.requiredLevel,
        requiredLevelB: csB.requiredLevel,
        a: {
          importance: csA.importance,
          requiredLevel: csA.requiredLevel,
        },
        b: {
          importance: csB.importance,
          requiredLevel: csB.requiredLevel,
        },
      });
    } else {
      // Unique to career A
      onlyA.push({
        slug,
        skill: skillA,
        importance: csA.importance,
        requiredLevel: csA.requiredLevel,
        importanceA: csA.importance,
      });
    }
  }

  // Iterate over skills in career B to find uniqueToB
  for (const csB of modelB.careerSkillsList || []) {
    const slug = csB.skillSlug;
    if (!mapA.has(slug)) {
      const skillB = skillsB.get(slug) || { slug, name: slug };
      onlyB.push({
        slug,
        skill: skillB,
        importance: csB.importance,
        requiredLevel: csB.requiredLevel,
        importanceB: csB.importance,
      });
    }
  }

  return {
    onlyA,
    common,
    onlyB,
  };
}

export default {
  compareCareers,
};
