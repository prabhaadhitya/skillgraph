export const LEVELS = [
  { value: 0, label: 'Not Started' },
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Basic' },
  { value: 3, label: 'Intermediate' },
  { value: 4, label: 'Advanced' },
  { value: 5, label: 'Expert' },
];

export const CATEGORIES = [
  { slug: 'programming', name: 'Programming' },
  { slug: 'web-development', name: 'Web Development' },
  { slug: 'backend', name: 'Backend' },
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'database', name: 'Database' },
  { slug: 'data-analytics', name: 'Data Analytics' },
  { slug: 'machine-learning', name: 'Machine Learning' },
  { slug: 'deep-learning', name: 'Deep Learning' },
  { slug: 'ai-llm', name: 'AI & LLM' },
  { slug: 'cloud', name: 'Cloud' },
  { slug: 'devops', name: 'DevOps' },
  { slug: 'cybersecurity', name: 'Cybersecurity' },
  { slug: 'tools', name: 'Tools' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export const RELATIONSHIP_TYPES = ['PREREQUISITE', 'RELATED_TO'];

export const ROLES = ['student', 'admin'];

export const GAP_STATUSES = ['strong', 'developing', 'major', 'critical'];

export const NODE_STATES = ['mastered', 'partial', 'missing', 'recommended', 'not_relevant'];

export const FIT_WEIGHTS = {
  coverage: 0.85,
  readiness: 0.15,
};

export const PRIORITY_WEIGHTS = {
  importance: 0.3,
  gap: 0.25,
  dependencyImpact: 0.3,
  ready: 0.15,
};

export const EFFORT_POINTS_PER_WEEK = 6;

export default {
  LEVELS,
  CATEGORIES,
  CATEGORY_SLUGS,
  RELATIONSHIP_TYPES,
  ROLES,
  GAP_STATUSES,
  NODE_STATES,
  FIT_WEIGHTS,
  PRIORITY_WEIGHTS,
  EFFORT_POINTS_PER_WEEK,
};
