/**
 * Allowed intents supported by the SkillGraph grounded assistant.
 */
export const ALLOWED_INTENTS = [
  'explain_skill',
  'explain_recommendation',
  'time_boxed_plan',
  'what_if',
  'skill_relationship',
  'progress_summary',
  'out_of_scope',
];

const NUMBER_WORDS = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

/**
 * Escape special regex characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find whole-word case-insensitive occurrences of catalog items in text.
 * Sorted by longest name first to avoid partial substring collisions.
 *
 * @param {string} text
 * @param {Array<{ slug: string, name: string }>} items
 * @returns {Array<{ slug: string, name: string }>} Matched items in order of appearance
 */
function findCatalogMatches(text, items = []) {
  if (!text || !Array.isArray(items) || items.length === 0) return [];

  const sorted = [...items]
    .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
    .sort((a, b) => b.name.length - a.name.length);

  const matches = [];
  const coveredRanges = [];

  for (const item of sorted) {
    const escaped = escapeRegex(item.name.trim());
    // Match whole words while correctly handling characters like ++ or . (e.g. C++, Node.js)
    const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=[^a-zA-Z0-9]|$)`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      const overlaps = coveredRanges.some(
        ([cStart, cEnd]) => (start >= cStart && start < cEnd) || (end > cStart && end <= cEnd),
      );

      if (!overlaps) {
        matches.push({ item, index: start });
        coveredRanges.push([start, end]);
      }
    }
  }

  matches.sort((a, b) => a.index - b.index);
  return matches.map((m) => m.item);
}

/**
 * Validates and normalizes raw intent object against catalog sets.
 *
 * @param {Object} raw - Raw intent { intent, params }
 * @param {Object} context - Catalog sets
 * @param {Set<string>} context.skillSlugs - Set of known skill slugs
 * @param {Set<string>} context.careerSlugs - Set of known career slugs
 * @returns {{ intent: string, params: Object }}
 */
export function validateIntent(raw, { skillSlugs = new Set(), careerSlugs = new Set() } = {}) {
  if (!raw || typeof raw !== 'object' || !ALLOWED_INTENTS.includes(raw.intent)) {
    return { intent: 'out_of_scope', params: {} };
  }

  const { intent, params = {} } = raw;
  const safeParams = typeof params === 'object' && params !== null ? params : {};

  switch (intent) {
    case 'explain_skill': {
      if (typeof safeParams.skillSlug === 'string' && skillSlugs.has(safeParams.skillSlug)) {
        return { intent: 'explain_skill', params: { skillSlug: safeParams.skillSlug } };
      }
      return { intent: 'out_of_scope', params: {} };
    }

    case 'explain_recommendation': {
      const resParams = {};
      if (typeof safeParams.skillSlug === 'string' && skillSlugs.has(safeParams.skillSlug)) {
        resParams.skillSlug = safeParams.skillSlug;
      }
      return { intent: 'explain_recommendation', params: resParams };
    }

    case 'time_boxed_plan': {
      let weeks = safeParams.weeks;
      if (typeof weeks !== 'number' || !Number.isInteger(weeks)) {
        weeks = parseInt(weeks, 10);
      }
      if (isNaN(weeks) || weeks === null) {
        weeks = 8;
      }
      const clampedWeeks = Math.min(52, Math.max(1, weeks));
      return { intent: 'time_boxed_plan', params: { weeks: clampedWeeks } };
    }

    case 'what_if': {
      if (typeof safeParams.careerSlug === 'string' && careerSlugs.has(safeParams.careerSlug)) {
        return { intent: 'what_if', params: { careerSlug: safeParams.careerSlug } };
      }
      return { intent: 'out_of_scope', params: {} };
    }

    case 'skill_relationship': {
      if (typeof safeParams.skillSlug === 'string' && skillSlugs.has(safeParams.skillSlug)) {
        const resParams = { skillSlug: safeParams.skillSlug };
        if (
          typeof safeParams.otherSkillSlug === 'string' &&
          skillSlugs.has(safeParams.otherSkillSlug)
        ) {
          resParams.otherSkillSlug = safeParams.otherSkillSlug;
        }
        return { intent: 'skill_relationship', params: resParams };
      }
      return { intent: 'out_of_scope', params: {} };
    }

    case 'progress_summary':
      return { intent: 'progress_summary', params: {} };

    case 'out_of_scope':
    default:
      return { intent: 'out_of_scope', params: {} };
  }
}

/**
 * Keyword-based heuristic intent router.
 *
 * @param {string} message - User query message
 * @param {Object} catalog
 * @param {Array<{ slug: string, name: string }>} [catalog.skills]
 * @param {Array<{ slug: string, name: string }>} [catalog.careers]
 * @returns {{ intent: string, params: Object }}
 */
export function keywordRouter(message = '', catalog = { skills: [], careers: [] }) {
  const text = String(message).trim();
  if (!text) {
    return { intent: 'out_of_scope', params: {} };
  }

  const matchedSkills = findCatalogMatches(text, catalog.skills || []);
  const matchedCareers = findCatalogMatches(text, catalog.careers || []);

  // 1. Mentions "month" or "week" with a number (N months = N*4 weeks) -> time_boxed_plan
  const timeRegex = /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(months?|weeks?)\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const rawVal = timeMatch[1].toLowerCase();
    const unit = timeMatch[2].toLowerCase();
    const num = NUMBER_WORDS[rawVal] || parseInt(rawVal, 10) || 1;
    const weeksCalculated = unit.startsWith('month') ? num * 4 : num;
    const weeks = Math.min(52, Math.max(1, weeksCalculated));
    return { intent: 'time_boxed_plan', params: { weeks } };
  }

  // 2. "switch", "what if", "instead of" or "become" together with a career name -> what_if
  if (
    matchedCareers.length > 0 &&
    /\b(switch|what\s+if|instead\s+of|become)\b/i.test(text)
  ) {
    // If user says "switch from X to Y" or "become Y", prefer career following "to" or "become"
    let chosenCareer = matchedCareers[0];
    for (const car of matchedCareers) {
      const toRegex = new RegExp(`\\b(?:to|become)\\s+${escapeRegex(car.name)}`, 'i');
      if (toRegex.test(text)) {
        chosenCareer = car;
        break;
      }
    }
    return { intent: 'what_if', params: { careerSlug: chosenCareer.slug } };
  }

  // 3. "already know", "prerequisite", "unlock" or two skills mentioned -> skill_relationship
  const hasRelKeyword = /\b(already\s+know|prerequisite|unlock|unlocks)\b/i.test(text);
  if (matchedSkills.length >= 2 || (matchedSkills.length === 1 && hasRelKeyword)) {
    const params = { skillSlug: matchedSkills[0].slug };
    if (matchedSkills[1]) {
      params.otherSkillSlug = matchedSkills[1].slug;
    }
    return { intent: 'skill_relationship', params };
  }

  // 4. "progress", "how am i doing" -> progress_summary
  if (/\b(progress|how\s+am\s+i\s+doing)\b/i.test(text)) {
    return { intent: 'progress_summary', params: {} };
  }

  // 5. "why" or "should i learn" with a skill -> explain_skill
  if (matchedSkills.length >= 1 && /\b(why|should\s+i\s+learn)\b/i.test(text)) {
    return { intent: 'explain_skill', params: { skillSlug: matchedSkills[0].slug } };
  }

  // 6. "next", "focus", "recommend", "what should i learn" -> explain_recommendation
  if (/\b(next|focus|recommend|recommending|what\s+should\s+i\s+learn)\b/i.test(text)) {
    const params = matchedSkills[0] ? { skillSlug: matchedSkills[0].slug } : {};
    return { intent: 'explain_recommendation', params };
  }

  // 7. Otherwise out_of_scope
  return { intent: 'out_of_scope', params: {} };
}

/**
 * Parse JSON intent object from LLM response.
 * Tolerates raw JSON, ```json fences, and surrounding conversational text.
 * Never throws.
 *
 * @param {string} text
 * @returns {Object|null}
 */
export function parseIntentJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;

  const trimmed = text.trim();

  // Try parsing direct JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Continue to fence / substring extraction
  }

  // Try extracting from markdown ```json or ``` code fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Continue to bracket search
    }
  }

  // Try extracting the first valid JSON object by finding { and }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const candidate = trimmed.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      return null;
    }
  }

  return null;
}
