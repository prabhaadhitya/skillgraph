const REASON_MAP = {
  HIGH_IMPORTANCE: 'it is very important for this career',
  LARGE_GAP: 'there is a big gap to close',
  UNLOCKS_MANY: 'it unlocks many other skills',
  QUICK_WIN: 'it is a quick win',
  REQUIRED_BY_CAREER: 'it is required for this career',
};

/**
 * Format an array of reason codes into conversational English.
 *
 * @param {Array<string>} [reasons=[]]
 * @returns {string}
 */
function formatReasons(reasons = []) {
  if (!Array.isArray(reasons) || reasons.length === 0) return '';
  const phrases = reasons.map((code) => REASON_MAP[code] || code).filter(Boolean);
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}

/**
 * Renders a deterministic plain-text answer from facts for degraded / fallback mode.
 *
 * @param {string} intent - Intent identifier
 * @param {Object} [facts={}] - Facts payload
 * @returns {string} Plain-text grounded answer
 */
export function renderTemplateAnswer(intent, facts = {}) {
  const data = facts && typeof facts === 'object' ? facts : {};

  switch (intent) {
    case 'explain_skill': {
      const skillName = data.skill?.name || 'This skill';
      const careerName = data.career?.name ? ` for ${data.career.name}` : '';
      const lines = [`${skillName} is a key skill${careerName}.`];

      if (data.you) {
        const current = data.you.proficiency ?? 0;
        const currentLabel = data.you.levelLabel ? ` (${data.you.levelLabel})` : '';
        const required = data.you.requiredLevel ?? 1;
        lines.push(`You are currently at level ${current}${currentLabel}, while level ${required} is required.`);
      }

      const reasonsText = formatReasons(data.reasons);
      if (reasonsText) {
        lines.push(`It is recommended because ${reasonsText}.`);
      }

      if (Array.isArray(data.prerequisites) && data.prerequisites.length > 0) {
        const unmet = data.prerequisites.filter((p) => !p.met);
        if (unmet.length > 0) {
          lines.push(`Prerequisites you still need: ${unmet.map((p) => p.name).join(', ')}.`);
        } else {
          lines.push('All prerequisites for this skill are satisfied.');
        }
      }

      if (Array.isArray(data.unlocks) && data.unlocks.length > 0) {
        lines.push(`Mastering it unlocks: ${data.unlocks.slice(0, 3).join(', ')}.`);
      }

      if (data.inPath) {
        lines.push(`It is step ${data.inPath.order ?? 1} of ${data.inPath.totalSteps ?? 1} in your learning path.`);
      }

      return lines.join(' ');
    }

    case 'explain_recommendation': {
      const careerName = data.career?.name || 'your target career';
      const lines = [];

      if (data.fit?.score != null) {
        const bandText = data.fit.band ? ` (${data.fit.band})` : '';
        lines.push(`Your estimated career alignment for ${careerName} is ${data.fit.score}%${bandText}.`);
      } else {
        lines.push(`Here are your next recommended steps for ${careerName}.`);
      }

      if (Array.isArray(data.nextSkills) && data.nextSkills.length > 0) {
        const formatted = data.nextSkills.map((s) => {
          const reasonStr = formatReasons(s.reasons);
          return reasonStr ? `${s.name} (${reasonStr})` : s.name;
        });
        lines.push(`Recommended next skills: ${formatted.join('; ')}.`);
      } else {
        lines.push('No immediate next skills are recommended at this time.');
      }

      return lines.join(' ');
    }

    case 'time_boxed_plan': {
      const weeks = data.weeks || 8;
      const careerName = data.career?.name ? ` for ${data.career.name}` : '';
      const capacity = data.capacityPoints ? ` (${data.capacityPoints} effort points)` : '';
      const lines = [`In your ${weeks}-week plan${careerName}${capacity}:`];

      if (Array.isArray(data.steps) && data.steps.length > 0) {
        const stepItems = data.steps.map(
          (s) => `${s.order ?? 1}. ${s.name} (level ${s.fromLevel ?? 0} to ${s.toLevel ?? 1})`,
        );
        lines.push(`Focus on: ${stepItems.join(', ')}.`);
      } else {
        lines.push('You have no outstanding steps to complete.');
      }

      if (Array.isArray(data.later) && data.later.length > 0) {
        const laterList = data.later.slice(0, 3).join(', ');
        const remaining = data.later.length > 3 ? ` and ${data.later.length - 3} more` : '';
        lines.push(`Remaining steps for later: ${laterList}${remaining}.`);
      }

      return lines.join(' ');
    }

    case 'what_if': {
      const currentCareer = data.current?.career?.name || 'your current target';
      const currentScore = data.current?.fitScore ?? 0;
      const altCareer = data.alternative?.career?.name || 'the alternative career';
      const altScore = data.alternative?.fitScore ?? 0;
      const delta = data.delta ?? (altScore - currentScore);
      const deltaSign = delta >= 0 ? `+${delta}` : `${delta}`;

      const lines = [
        `Comparing careers: your estimated career alignment is ${currentScore}% for ${currentCareer} vs ${altScore}% for ${altCareer} (a ${deltaSign}% change).`,
      ];

      if (Array.isArray(data.newlyRequired) && data.newlyRequired.length > 0) {
        const names = data.newlyRequired.map((s) => s.name || s).join(', ');
        lines.push(`Newly required skills: ${names}.`);
      }

      if (Array.isArray(data.topPriority) && data.topPriority.length > 0) {
        lines.push(`Top priority skills to start: ${data.topPriority.join(', ')}.`);
      }

      return lines.join(' ');
    }

    case 'skill_relationship': {
      const skillName = data.skill?.name || 'The skill';
      const otherName = data.other?.name || 'the other skill';
      const lines = [];

      switch (data.relation) {
        case 'prerequisite':
          lines.push(`${skillName} is a prerequisite required for ${otherName}.`);
          break;
        case 'unlocks':
          lines.push(`Mastering ${skillName} unlocks ${otherName}.`);
          break;
        case 'related':
          lines.push(`${skillName} and ${otherName} are conceptually related skills.`);
          break;
        case 'none':
          lines.push(`There is no direct prerequisite or unlock relationship between ${skillName} and ${otherName}.`);
          break;
        default:
          lines.push(`Relationship between ${skillName} and ${otherName}: ${data.relation || 'none'}.`);
          break;
      }

      if (Array.isArray(data.pathBetween) && data.pathBetween.length > 0) {
        lines.push(`Path connection: ${data.pathBetween.join(' -> ')}.`);
      }

      if (data.youKnow) {
        const sLvl = data.youKnow.skill || 'unverified';
        const oLvl = data.youKnow.other || 'unverified';
        lines.push(`Your levels: ${skillName} (${sLvl}), ${otherName} (${oLvl}).`);
      }

      return lines.join(' ');
    }

    case 'progress_summary': {
      const careerName = data.career?.name ? ` for ${data.career.name}` : '';
      const lines = [];

      if (data.fit?.score != null) {
        const deltaStr = data.fit.delta != null ? ` (${data.fit.delta >= 0 ? `+${data.fit.delta}` : data.fit.delta}% change)` : '';
        lines.push(`Your current estimated career alignment${careerName} is ${data.fit.score}%${deltaStr}.`);
      } else {
        lines.push(`Here is your current progress summary${careerName}.`);
      }

      if (data.summary) {
        const strong = data.summary.strong ?? 0;
        const dev = data.summary.developing ?? 0;
        const miss = data.summary.missing ?? 0;
        const tot = data.summary.total ?? 0;
        lines.push(`Skills summary: ${strong} strong, ${dev} developing, and ${miss} missing (${tot} total).`);
      }

      if (Array.isArray(data.recentChanges) && data.recentChanges.length > 0) {
        const changes = data.recentChanges.map((c) => `${c.name} (${c.previousLevel} -> ${c.currentLevel})`).join(', ');
        lines.push(`Recent changes: ${changes}.`);
      }

      if (Array.isArray(data.nextSkills) && data.nextSkills.length > 0) {
        lines.push(`Next recommended focus: ${data.nextSkills.join(', ')}.`);
      }

      return lines.join(' ');
    }

    case 'out_of_scope':
    default:
      return 'I can only help with questions about your skills, the skill graph, and career learning paths. Please ask about a skill, career alignment, or your recommended next steps.';
  }
}
