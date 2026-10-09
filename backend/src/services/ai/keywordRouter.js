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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find catalog items mentioned in text (longest name first).
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

  // Obvious off-topic queries (creative writing, recipes, weather, riddles, unrelated topics)
  if (
    matchedSkills.length === 0 &&
    matchedCareers.length === 0 &&
    /\b(poem|poetry|story|joke|recipe|weather|song|riddle|horoscope|lyrics|bake|cook)\b/i.test(text)
  ) {
    return { intent: 'out_of_scope', params: {} };
  }

  // 1. Mentions "month" or "week" with a number -> time_boxed_plan
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

  // 2. Mentions career + switch/what-if/suit/better/become/instead of -> what_if
  if (
    matchedCareers.length > 0 &&
    /\b(switch|what\s+if|instead\s+of|become|suit|better|alternative)\b/i.test(text)
  ) {
    let chosenCareer = matchedCareers[0];
    for (const car of matchedCareers) {
      const carRegex = new RegExp(`\\b(?:to|become|suit|if|for)\\s+${escapeRegex(car.name)}`, 'i');
      if (carRegex.test(text)) {
        chosenCareer = car;
        break;
      }
    }
    return { intent: 'what_if', params: { careerSlug: chosenCareer.slug } };
  }

  // 3. Mentions skill relationships: before, prerequisites, unlock, connects, etc.
  const hasRelKeyword = /\b(already\s+know|prerequisite|prerequisites|unlock|unlocks|before|need\s+before|prior\s+to|connect|connects)\b/i.test(text);
  if (matchedSkills.length >= 2 || (matchedSkills.length === 1 && hasRelKeyword)) {
    const params = { skillSlug: matchedSkills[0].slug };
    if (matchedSkills[1]) {
      params.otherSkillSlug = matchedSkills[1].slug;
    }
    return { intent: 'skill_relationship', params };
  }

  // 4. Mentions progress / improvement -> progress_summary
  if (/\b(progress|how\s+am\s+i\s+doing|improve|improved|improvement|lately)\b/i.test(text)) {
    return { intent: 'progress_summary', params: {} };
  }

  // 5. Mentions recommended / what should I learn first -> explain_recommendation
  if (/\b(top\s+recommended|recommend|recommended|recommending|what\s+should\s+i\s+learn|learn\s+first|next\s+skill)\b/i.test(text)) {
    const params = matchedSkills[0] ? { skillSlug: matchedSkills[0].slug } : {};
    return { intent: 'explain_recommendation', params };
  }

  // 6. Mentions why learn / what is a skill -> explain_skill
  if (matchedSkills.length >= 1 && /\b(why|should\s+i\s+learn|what\s+is|career\s+need)\b/i.test(text)) {
    return { intent: 'explain_skill', params: { skillSlug: matchedSkills[0].slug } };
  }

  // 7. Otherwise out_of_scope
  return { intent: 'out_of_scope', params: {} };
}

export default keywordRouter;
