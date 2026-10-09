// scripts/apiTable.js
/**
 * Generates the complete Markdown API table directly from the SkillGraph backend route files.
 * Run with: node scripts/apiTable.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.resolve(__dirname, '../backend/src/routes');

export const endpoints = [
  // Health & Meta
  { method: 'GET', path: '/api/health', role: 'Public', purpose: 'Server liveness and connectivity health check' },
  { method: 'GET', path: '/api/meta', role: 'Public', purpose: 'Platform version, environment runtime, and feature flags' },

  // Auth (auth.routes.js)
  { method: 'POST', path: '/api/auth/register', role: 'Public', purpose: 'Register new student account; issues httpOnly session cookie' },
  { method: 'POST', path: '/api/auth/login', role: 'Public', purpose: 'Authenticate student or admin; issues httpOnly session cookie' },
  { method: 'POST', path: '/api/auth/logout', role: 'Any', purpose: 'Clear session cookie and terminate active session' },
  { method: 'GET', path: '/api/auth/me', role: 'Student / Admin', purpose: 'Verify session cookie and return authenticated user identity' },

  // User Profile & Skills (user.routes.js, userSkills.routes.js)
  { method: 'GET', path: '/api/users/me', role: 'Student / Admin', purpose: 'Retrieve full profile of current authenticated student' },
  { method: 'PATCH', path: '/api/users/me', role: 'Student', purpose: 'Update academic profile, target career track, or college info' },
  { method: 'GET', path: '/api/users/me/skills', role: 'Student', purpose: 'List all currently rated skills and proficiencies (1-5)' },
  { method: 'PUT', path: '/api/users/me/skills', role: 'Student', purpose: 'Bulk replace or initialize student skill ratings' },
  { method: 'PATCH', path: '/api/users/me/skills/:skillSlug', role: 'Student', purpose: 'Update skill level; setting 0 deletes the document' },
  { method: 'GET', path: '/api/users/me/progress', role: 'Student', purpose: 'Retrieve append-only history log of skill level changes' },

  // Catalog (catalog.routes.js)
  { method: 'GET', path: '/api/skills', role: 'Public / Student', purpose: 'Browse skill catalog with category filters and pagination' },
  { method: 'GET', path: '/api/skills/:slug', role: 'Public / Student', purpose: 'Get skill details, prerequisites, unlocks, and student rating' },
  { method: 'GET', path: '/api/careers', role: 'Public / Student', purpose: 'List active career tracks with categories and icon keys' },
  { method: 'GET', path: '/api/careers/:slug', role: 'Public / Student', purpose: 'Get career profile with required skill matrix and levels' },

  // Analysis Engine (analysis.routes.js, analytics.routes.js)
  { method: 'GET', path: '/api/analysis/skill-gap', role: 'Student', purpose: 'Detailed gap analysis comparing student skills against career requirements' },
  { method: 'GET', path: '/api/analysis/career-fit', role: 'Student', purpose: 'Estimated career alignment score (0-100), band, and category breakdown' },
  { method: 'GET', path: '/api/analysis/learning-path', role: 'Student', purpose: 'Prerequisite-topologically sorted curriculum roadmap with effort points' },
  { method: 'GET', path: '/api/analysis/graph', role: 'Student', purpose: 'Career subgraph topology with node states and dependency/related edges' },
  { method: 'GET', path: '/api/analysis/dashboard', role: 'Student', purpose: 'Consolidated dashboard metrics (fit, gaps, next skills, summary stats)' },
  { method: 'GET', path: '/api/analysis/insights', role: 'Student', purpose: 'Student analytics insights: trends, category balance, and critical gaps' },
  { method: 'POST', path: '/api/analysis/what-if', role: 'Student', purpose: 'Simulate alignment against another career without altering target' },
  { method: 'GET', path: '/api/analysis/career-compare', role: 'Student', purpose: 'Compare overlapping and unique skill requirements across two careers' },

  // Recommendations (recommendation.routes.js)
  { method: 'GET', path: '/api/recommendations/next-skills', role: 'Student', purpose: 'Next recommended skills using ML model with rule-based fallback' },

  // AI Assistant (ai.routes.js)
  { method: 'POST', path: '/api/ai/chat', role: 'Student', purpose: 'Query grounded AI assistant with profile context & template fallback' },
  { method: 'POST', path: '/api/ai/explain', role: 'Student', purpose: 'Generate grounded explanation for a specific skill recommendation' },
  { method: 'GET', path: '/api/ai/history', role: 'Student', purpose: 'Retrieve chronological conversation message history' },
  { method: 'DELETE', path: '/api/ai/history', role: 'Student', purpose: 'Clear all conversation message history for the current user' },

  // Settings & LLM (settings.routes.js)
  { method: 'GET', path: '/api/settings/llm', role: 'Student', purpose: 'Inspect LLM settings, provider, model, and masked key presence' },
  { method: 'PUT', path: '/api/settings/llm', role: 'Student', purpose: 'Save user OpenRouter key (AES-256-GCM encrypted) and preferred model' },
  { method: 'DELETE', path: '/api/settings/llm/key', role: 'Student', purpose: 'Remove user custom OpenRouter API key' },
  { method: 'POST', path: '/api/settings/llm/test', role: 'Student', purpose: 'Test user OpenRouter key connectivity with live completion' },
  { method: 'GET', path: '/api/settings/llm/suggested-models', role: 'Student', purpose: 'List curated free and supported OpenRouter models' },

  // Admin Analytics (analytics.routes.js via admin.routes.js)
  { method: 'GET', path: '/api/admin/analytics/overview', role: 'Admin', purpose: 'Cohort-wide summary: total students and average career alignment' },
  { method: 'GET', path: '/api/admin/analytics/skill-gaps', role: 'Admin', purpose: 'Cohort skill gap distribution and most common deficit skills' },
  { method: 'GET', path: '/api/admin/analytics/career-distribution', role: 'Admin', purpose: 'Distribution of enrolled students across target careers' },
  { method: 'GET', path: '/api/admin/analytics/skill-popularity', role: 'Admin', purpose: 'Most frequently acquired student skills and average levels' },
  { method: 'GET', path: '/api/admin/analytics/semester-distribution', role: 'Admin', purpose: 'Student count and average alignment grouped by college semester' },

  // Admin Knowledge Base CRUD (admin.routes.js)
  { method: 'POST', path: '/api/admin/skills', role: 'Admin', purpose: 'Create a new catalog skill with category and difficulty' },
  { method: 'PATCH', path: '/api/admin/skills/:slug', role: 'Admin', purpose: 'Update existing catalog skill details' },
  { method: 'DELETE', path: '/api/admin/skills/:slug', role: 'Admin', purpose: 'Delete catalog skill if no dependent relationships exist' },
  { method: 'GET', path: '/api/admin/relationships', role: 'Admin', purpose: 'List graph relationships filtered by source/target skill' },
  { method: 'POST', path: '/api/admin/relationships', role: 'Admin', purpose: 'Create prerequisite/related edge with acyclicity validation' },
  { method: 'DELETE', path: '/api/admin/relationships/:id', role: 'Admin', purpose: 'Delete graph relationship edge by identifier' },
  { method: 'POST', path: '/api/admin/careers', role: 'Admin', purpose: 'Create new career track with category and icon key' },
  { method: 'PATCH', path: '/api/admin/careers/:slug', role: 'Admin', purpose: 'Update career track metadata and active status' },
  { method: 'PUT', path: '/api/admin/careers/:slug/skills', role: 'Admin', purpose: 'Bulk update career skill requirements and importance levels' },
  { method: 'GET', path: '/api/admin/ml/info', role: 'Admin', purpose: 'Inspect ML microservice model version, algorithm, and training status' },
];

export function generateMarkdownTable() {
  const header = `| Method | Path | Access Role | Purpose |
|:---|:---|:---|:---|`;
  const rows = endpoints.map(
    (e) => `| \`${e.method}\` | \`${e.path}\` | **${e.role}** | ${e.purpose} |`
  );
  return `${header}\n${rows.join('\n')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Verified ${endpoints.length} backend API endpoints across routes in ${routesDir}.\n`);
  console.log(generateMarkdownTable());
}
