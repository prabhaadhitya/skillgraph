/**
 * Pure function: Plan a time-boxed learning plan within an effort point budget.
 *
 * Algorithm (see ARCHITECTURE.md §5.9):
 * EFFORT_POINTS_PER_WEEK = 6 (default)
 * budget = weeks * EFFORT_POINTS_PER_WEEK
 * Walk the learning path steps in order, accumulating effortPoints until budget is exhausted.
 * Remaining steps are truncated (postponed to later).
 *
 * @param {Object|Array<Object>} path - Learning path object ({ steps: [...] }) or array of steps
 * @param {number} weeks - Number of weeks available
 * @param {number} [EFFORT_POINTS_PER_WEEK=6] - Effort points per week budget
 * @returns {{
 *   steps: Array<Object>,
 *   totalEffort: number,
 *   budget: number,
 *   truncated: boolean
 * }}
 */
export function planWithinBudget(path, weeks, EFFORT_POINTS_PER_WEEK = 6) {
  const allSteps = Array.isArray(path)
    ? path
    : (path && Array.isArray(path.steps) ? path.steps : []);

  const numWeeks = Math.max(0, Number(weeks) || 0);
  const rate = Math.max(0, Number(EFFORT_POINTS_PER_WEEK) || 6);
  const budget = numWeeks * rate;

  const steps = [];
  let totalEffort = 0;
  let truncated = false;

  for (const step of allSteps) {
    const effort = Math.max(0, Number(step.effortPoints) || 0);
    if (totalEffort + effort <= budget) {
      steps.push(step);
      totalEffort += effort;
    } else {
      truncated = true;
      break;
    }
  }

  // If there were steps left over after stopping or budget was insufficient for even the first step
  if (steps.length < allSteps.length) {
    truncated = true;
  }

  return {
    steps,
    totalEffort,
    budget,
    truncated,
  };
}

export default {
  planWithinBudget,
};
