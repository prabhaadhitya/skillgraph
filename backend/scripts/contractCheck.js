import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load backend environment
const envPath = path.resolve('backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoStudent123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@skillgraph.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

let prabhaCookie = '';
let adminCookie = '';

const results = [];
const timings = [];

/**
 * Execute an API call and check the response contract.
 */
async function callAndCheck({
  name,
  method = 'GET',
  path: urlPath,
  cookie = null,
  body = null,
  expectedStatus = 200,
  requiredDataKeys = [],
  validateFn = null,
  isTimingChecked = false,
}) {
  const url = `${BASE_URL}${urlPath}`;
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  if (body) headers['Content-Type'] = 'application/json';

  const startTime = performance.now();
  let res;
  let json;
  let durationMs = 0;

  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    durationMs = Math.round(performance.now() - startTime);

    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  } catch (err) {
    results.push({
      endpoint: `${method} ${urlPath}`,
      expected: expectedStatus,
      got: `ERR: ${err.message}`,
      status: 'FAIL',
      reason: err.message,
    });
    return null;
  }

  if (isTimingChecked) {
    timings.push({ endpoint: `${method} ${urlPath}`, durationMs });
  }

  // Contract checks
  const errors = [];

  if (res.status !== expectedStatus) {
    errors.push(`Status mismatch: expected ${expectedStatus}, got ${res.status}`);
    console.log(`[FAIL] ${name}: expected ${expectedStatus}, got ${res.status}, body: ${JSON.stringify(json)}`);
  }

  if (expectedStatus >= 200 && expectedStatus < 300) {
    if (!json || json.success !== true) {
      errors.push(`Envelope missing or success !== true (got ${JSON.stringify(json?.success)})`);
    }
    if (json && !('data' in json)) {
      errors.push('Response envelope missing "data" key');
    }

    if (json?.data && requiredDataKeys.length > 0) {
      const data = json.data;
      if (Array.isArray(data)) {
        // If data is an array, we can check that it's an array
      } else if (typeof data === 'object' && data !== null) {
        for (const key of requiredDataKeys) {
          if (!(key in data)) {
            errors.push(`Missing expected data key: "${key}"`);
          }
        }
      }
    }

    if (validateFn && json?.data) {
      try {
        const customErr = validateFn(json.data, json.meta);
        if (customErr) errors.push(customErr);
      } catch (err) {
        errors.push(`Custom validation error: ${err.message}`);
      }
    }
  } else {
    // Failure envelope check
    if (!json || json.success !== false) {
      errors.push('Error envelope missing success: false');
    }
    if (!json?.error || !json.error.code || !json.error.message) {
      errors.push('Error envelope missing error.code or error.message');
    }
  }

  const isOk = errors.length === 0;
  results.push({
    endpoint: `${method} ${urlPath}`,
    expected: expectedStatus,
    got: res.status,
    status: isOk ? 'OK' : 'FAIL',
    reason: errors.join('; '),
    durationMs,
  });

  return { res, json };
}

async function run() {
  console.log(`Starting SkillGraph Contract Check against ${BASE_URL}...\n`);

  // 1. Login as Prabha
  const prabhaLoginRes = await callAndCheck({
    name: 'POST /auth/login (prabha)',
    method: 'POST',
    path: '/auth/login',
    body: { email: 'prabha@demo.skillgraph.dev', password: DEMO_PASSWORD },
    expectedStatus: 200,
    requiredDataKeys: ['user'],
  });

  if (prabhaLoginRes?.res) {
    const rawCookie = prabhaLoginRes.res.headers.get('set-cookie') || '';
    prabhaCookie = rawCookie.split(';')[0];
  }

  // 2. Login as Admin
  const adminLoginRes = await callAndCheck({
    name: 'POST /auth/login (admin)',
    method: 'POST',
    path: '/auth/login',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    expectedStatus: 200,
    requiredDataKeys: ['user'],
  });

  if (adminLoginRes?.res) {
    const rawCookie = adminLoginRes.res.headers.get('set-cookie') || '';
    adminCookie = rawCookie.split(';')[0];
  }

  // =========================================================================
  // Section 2: Meta
  // =========================================================================
  await callAndCheck({
    name: 'GET /meta',
    path: '/meta',
    expectedStatus: 200,
    requiredDataKeys: ['levels', 'categories', 'relationshipTypes', 'gapStatuses', 'nodeStates', 'counts'],
  });

  // =========================================================================
  // Section 3: Auth
  // =========================================================================
  const tempEmail = `test-user-${Date.now()}@demo.skillgraph.dev`;
  await callAndCheck({
    name: 'POST /auth/register',
    method: 'POST',
    path: '/auth/register',
    body: { name: 'Temp Test User', email: tempEmail, password: 'Password123!' },
    expectedStatus: 201,
    requiredDataKeys: ['user'],
  });

  await callAndCheck({
    name: 'GET /auth/me',
    path: '/auth/me',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['user'],
  });

  // =========================================================================
  // Section 4: Users
  // =========================================================================
  await callAndCheck({
    name: 'GET /users/me',
    path: '/users/me',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['user'],
  });

  await callAndCheck({
    name: 'PATCH /users/me',
    method: 'PATCH',
    path: '/users/me',
    cookie: prabhaCookie,
    body: { college: 'Chaitanya' },
    expectedStatus: 200,
    requiredDataKeys: ['user'],
  });

  const userSkillsRes = await callAndCheck({
    name: 'GET /users/me/skills',
    path: '/users/me/skills',
    cookie: prabhaCookie,
    expectedStatus: 200,
    validateFn: (data) => {
      if (!Array.isArray(data.items)) return 'data.items must be an array';
      return null;
    },
  });

  // Safe PUT to test endpoint contract without destroying prabha's skills
  const existingSkills = (userSkillsRes?.json?.data?.items || []).map((i) => ({
    skillSlug: i.skill?.slug || i.skill,
    proficiency: i.proficiency,
  }));

  await callAndCheck({
    name: 'PUT /users/me/skills',
    method: 'PUT',
    path: '/users/me/skills',
    cookie: prabhaCookie,
    body: { skills: existingSkills },
    expectedStatus: 200,
    requiredDataKeys: ['items', 'fit'],
  });

  await callAndCheck({
    name: 'PATCH /users/me/skills/:skillSlug',
    method: 'PATCH',
    path: '/users/me/skills/statistics',
    cookie: prabhaCookie,
    body: { proficiency: 1 },
    expectedStatus: 200,
    requiredDataKeys: ['skill', 'previousLevel', 'proficiency', 'fit'],
  });

  await callAndCheck({
    name: 'GET /users/me/progress',
    path: '/users/me/progress',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['history', 'alignment'],
  });

  // =========================================================================
  // Section 5: Catalog
  // =========================================================================
  await callAndCheck({
    name: 'GET /skills',
    path: '/skills',
    cookie: prabhaCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data) && !Array.isArray(data.items) ? 'Skills list must be an array or { items }' : null),
  });

  await callAndCheck({
    name: 'GET /skills/:slug',
    path: '/skills/statistics',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['skill', 'prerequisites', 'unlocks', 'related', 'requiredFor', 'you'],
  });

  await callAndCheck({
    name: 'GET /careers',
    path: '/careers',
    cookie: prabhaCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data) && !Array.isArray(data.items) ? 'Careers list must be an array or { items }' : null),
  });

  await callAndCheck({
    name: 'GET /careers/:slug',
    path: '/careers/machine-learning-engineer',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['career', 'skills'],
  });

  // =========================================================================
  // Section 6: Analysis (Checked for Performance < 500 ms)
  // =========================================================================
  await callAndCheck({
    name: 'GET /analysis/skill-gap',
    path: '/analysis/skill-gap',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['career', 'summary', 'items'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /analysis/career-fit',
    path: '/analysis/career-fit',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['career', 'label', 'fitScore', 'band', 'breakdown', 'weights'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /analysis/learning-path',
    path: '/analysis/learning-path',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['career', 'totalSteps', 'totalEffortPoints', 'steps'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /analysis/graph',
    path: '/analysis/graph',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['career', 'nodes', 'edges', 'stats'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /analysis/dashboard',
    path: '/analysis/dashboard',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['user', 'career', 'fit', 'summary', 'nextSkills', 'strategy', 'topGaps', 'updatedAt'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /analysis/insights',
    path: '/analysis/insights',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['categoryDistribution', 'alignmentHistory', 'topMissing'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'POST /analysis/what-if',
    method: 'POST',
    path: '/analysis/what-if',
    cookie: prabhaCookie,
    body: { careerSlug: 'data-scientist' },
    expectedStatus: 200,
    requiredDataKeys: ['current', 'alternative', 'delta', 'newlyRequired', 'noLongerRequired'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /analysis/career-compare',
    path: '/analysis/career-compare?a=data-scientist&b=machine-learning-engineer',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['a', 'b', 'common', 'uniqueToA', 'uniqueToB'],
    isTimingChecked: true,
  });

  // =========================================================================
  // Section 7: Recommendations
  // =========================================================================
  await callAndCheck({
    name: 'GET /recommendations/next-skills',
    path: '/recommendations/next-skills',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['strategy', 'modelVersion', 'items'],
  });

  // =========================================================================
  // Section 8: Admin Analytics (Checked for Performance < 500 ms)
  // =========================================================================
  await callAndCheck({
    name: 'GET /admin/analytics/overview',
    path: '/admin/analytics/overview',
    cookie: adminCookie,
    expectedStatus: 200,
    requiredDataKeys: ['totalStudents', 'onboardedStudents', 'avgFitScore', 'totalSkills', 'totalCareers'],
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /admin/analytics/skill-gaps',
    path: '/admin/analytics/skill-gaps',
    cookie: adminCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data.items) ? 'data.items must be an array' : null),
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /admin/analytics/career-distribution',
    path: '/admin/analytics/career-distribution',
    cookie: adminCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data.items) ? 'data.items must be an array' : null),
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /admin/analytics/skill-popularity',
    path: '/admin/analytics/skill-popularity',
    cookie: adminCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data.items) ? 'data.items must be an array' : null),
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /admin/analytics/semester-distribution',
    path: '/admin/analytics/semester-distribution',
    cookie: adminCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data.items) ? 'data.items must be an array' : null),
    isTimingChecked: true,
  });

  await callAndCheck({
    name: 'GET /admin/ml/info',
    path: '/admin/ml/info',
    cookie: adminCookie,
    expectedStatus: 200,
  });

  // =========================================================================
  // Section 9: Admin Knowledge-Base CRUD
  // =========================================================================
  const testSkillSlug = `contract-skill-${Date.now()}`;
  await callAndCheck({
    name: 'POST /admin/skills',
    method: 'POST',
    path: '/admin/skills',
    cookie: adminCookie,
    body: {
      name: 'Contract Test Skill',
      slug: testSkillSlug,
      description: 'Skill for contract checking',
      category: 'programming',
      difficulty: 2,
    },
    expectedStatus: 201,
    requiredDataKeys: ['skill'],
  });

  await callAndCheck({
    name: 'PATCH /admin/skills/:slug',
    method: 'PATCH',
    path: `/admin/skills/${testSkillSlug}`,
    cookie: adminCookie,
    body: { description: 'Updated test skill description' },
    expectedStatus: 200,
    requiredDataKeys: ['skill'],
  });

  await callAndCheck({
    name: 'GET /admin/relationships?skill=python',
    path: '/admin/relationships?skill=python',
    cookie: adminCookie,
    expectedStatus: 200,
  });

  const relCreateRes = await callAndCheck({
    name: 'POST /admin/relationships',
    method: 'POST',
    path: '/admin/relationships',
    cookie: adminCookie,
    body: {
      source: 'python',
      target: testSkillSlug,
      type: 'RELATED_TO',
      strength: 0.8,
    },
    expectedStatus: 201,
    requiredDataKeys: ['relationship'],
  });

  const createdRelId = relCreateRes?.json?.data?.relationship?.id;
  if (createdRelId) {
    await callAndCheck({
      name: 'DELETE /admin/relationships/:id',
      method: 'DELETE',
      path: `/admin/relationships/${createdRelId}`,
      cookie: adminCookie,
      expectedStatus: 200,
      requiredDataKeys: ['deleted'],
    });
  }

  await callAndCheck({
    name: 'DELETE /admin/skills/:slug',
    method: 'DELETE',
    path: `/admin/skills/${testSkillSlug}`,
    cookie: adminCookie,
    expectedStatus: 200,
    requiredDataKeys: ['deleted'],
  });

  const testCareerSlug = `contract-career-${Date.now()}`;
  await callAndCheck({
    name: 'POST /admin/careers',
    method: 'POST',
    path: '/admin/careers',
    cookie: adminCookie,
    body: {
      name: 'Contract Test Career',
      slug: testCareerSlug,
      description: 'Career for contract checking',
      category: 'software',
      icon: 'code',
    },
    expectedStatus: 201,
    requiredDataKeys: ['career'],
  });

  await callAndCheck({
    name: 'PATCH /admin/careers/:slug',
    method: 'PATCH',
    path: `/admin/careers/${testCareerSlug}`,
    cookie: adminCookie,
    body: { description: 'Updated career description' },
    expectedStatus: 200,
    requiredDataKeys: ['career'],
  });

  await callAndCheck({
    name: 'PUT /admin/careers/:slug/skills',
    method: 'PUT',
    path: `/admin/careers/${testCareerSlug}/skills`,
    cookie: adminCookie,
    body: {
      skills: [{ skillSlug: 'programming-fundamentals', importance: 0.9, requiredLevel: 3 }],
    },
    expectedStatus: 200,
    requiredDataKeys: ['career', 'skills'],
  });

  // =========================================================================
  // Section 10: Assistant (AI)
  // =========================================================================
  await callAndCheck({
    name: 'POST /ai/chat',
    method: 'POST',
    path: '/ai/chat',
    cookie: prabhaCookie,
    body: { message: 'Why should I learn SQL?' },
    expectedStatus: 200,
    requiredDataKeys: ['reply', 'intent', 'degraded', 'keySource', 'model', 'grounding'],
  });

  await callAndCheck({
    name: 'POST /ai/explain',
    method: 'POST',
    path: '/ai/explain',
    cookie: prabhaCookie,
    body: { skillSlug: 'statistics' },
    expectedStatus: 200,
    requiredDataKeys: ['reply', 'intent', 'degraded', 'keySource', 'model', 'grounding'],
  });

  await callAndCheck({
    name: 'GET /ai/history',
    path: '/ai/history',
    cookie: prabhaCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data.items) ? 'data.items must be an array' : null),
  });

  await callAndCheck({
    name: 'DELETE /ai/history',
    method: 'DELETE',
    path: '/ai/history',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['cleared'],
  });

  // =========================================================================
  // Section 11: LLM Settings
  // =========================================================================
  await callAndCheck({
    name: 'GET /settings/llm',
    path: '/settings/llm',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['provider', 'hasKey', 'serverKeyAvailable', 'serverKeyRemainingToday'],
  });

  await callAndCheck({
    name: 'PUT /settings/llm',
    method: 'PUT',
    path: '/settings/llm',
    cookie: prabhaCookie,
    body: { model: 'google/gemini-2.0-flash-exp:free' },
    expectedStatus: 200,
    requiredDataKeys: ['provider', 'model', 'hasKey'],
  });

  await callAndCheck({
    name: 'DELETE /settings/llm/key',
    method: 'DELETE',
    path: '/settings/llm/key',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['provider', 'hasKey'],
  });

  await callAndCheck({
    name: 'GET /settings/llm/suggested-models',
    path: '/settings/llm/suggested-models',
    cookie: prabhaCookie,
    expectedStatus: 200,
    validateFn: (data) => (!Array.isArray(data.items) ? 'data.items must be an array' : null),
  });

  // Logout
  await callAndCheck({
    name: 'POST /auth/logout',
    method: 'POST',
    path: '/auth/logout',
    cookie: prabhaCookie,
    expectedStatus: 200,
    requiredDataKeys: ['loggedOut'],
  });

  // =========================================================================
  // PRINT SUMMARY TABLES
  // =========================================================================
  console.log('\n================================================================================');
  console.log('                          CONTRACT VERIFICATION TABLE                            ');
  console.log('================================================================================');
  console.log('| Endpoint                                                 | Expected | Got | Result | Details');
  console.log('|----------------------------------------------------------|----------|-----|--------|------------------------------');

  let failCount = 0;
  for (const r of results) {
    const ep = r.endpoint.padEnd(56);
    const exp = String(r.expected).padEnd(8);
    const got = String(r.got).padEnd(3);
    const res = r.status.padEnd(6);
    const reason = r.reason || '';
    if (r.status === 'FAIL') failCount++;
    console.log(`| ${ep} | ${exp} | ${got} | ${res} | ${reason}`);
  }

  console.log('\n================================================================================');
  console.log('                        PERFORMANCE BENCHMARK TABLE (<500ms)                    ');
  console.log('================================================================================');
  console.log('| Endpoint                                                 | Duration (ms) | Under 500ms?');
  console.log('|----------------------------------------------------------|---------------|-------------');

  let slowCount = 0;
  for (const t of timings) {
    const ep = t.endpoint.padEnd(56);
    const dur = String(t.durationMs).padStart(13);
    const ok = t.durationMs < 500 ? 'YES (PASS)' : 'NO (SLOW)';
    if (t.durationMs >= 500) slowCount++;
    console.log(`| ${ep} | ${dur} | ${ok}`);
  }

  console.log(`\nSummary: ${results.length} endpoints checked. ${failCount} FAIL, ${results.length - failCount} OK.`);
  console.log(`Performance: ${timings.length} endpoints measured. ${slowCount} SLOW (>=500ms).\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during contract check:', err);
  process.exit(1);
});
