// backend/scripts/badInputCheck.js
/**
 * Bad-input sweep for all write endpoints in SkillGraph:
 * Sends empty body, wrong type, huge string, and object where string is expected.
 * Expects 400 VALIDATION_ERROR, never 500.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-qa-bypass-rate-limit': 'true',
      ...(options.headers || {}),
    },
  });
  let json = null;
  try {
    json = await res.json();
  } catch (err) {
    // Non-JSON response
  }
  return { status: res.status, data: json };
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-qa-bypass-rate-limit': 'true',
    },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie');
  if (!cookie) {
    const text = await res.text();
    throw new Error(`Failed to log in as ${email}: status ${res.status}, body ${text}`);
  }
  return cookie.split(';')[0];
}

async function run() {
  console.log(`Starting Bad-Input Sweep against ${BASE_URL}...\n`);

  const studentCookie = await login('prabha@demo.skillgraph.dev', process.env.DEMO_PASSWORD || 'DemoStudent123!');
  const adminCookie = await login('admin@skillgraph.dev', process.env.ADMIN_PASSWORD || 'AdminPassword123!');

  const hugeString = 'X'.repeat(100000);

  // List of write endpoints with tests
  const testCases = [
    // 1. POST /auth/register
    {
      name: 'POST /auth/register',
      method: 'POST',
      url: '/auth/register',
      cookie: null,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (name is number, email is bool)', body: { name: 12345, email: true, password: 999 } },
        { desc: 'huge string password', body: { name: 'Test', email: 'test@example.com', password: hugeString } },
        { desc: 'object where string expected', body: { name: { first: 'John' }, email: 'test@example.com', password: 'ValidPass123!' } },
      ],
    },
    // 2. POST /auth/login
    {
      name: 'POST /auth/login',
      method: 'POST',
      url: '/auth/login',
      cookie: null,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (email is number)', body: { email: 12345, password: 'abc' } },
        { desc: 'huge string email', body: { email: hugeString, password: 'abc' } },
        { desc: 'object where string expected', body: { email: { $gt: '' }, password: 'abc' } },
      ],
    },
    // 3. PATCH /users/me
    {
      name: 'PATCH /users/me',
      method: 'PATCH',
      url: '/users/me',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body (strict schema / empty update)', body: {} },
        { desc: 'wrong type (targetCareerId is boolean)', body: { targetCareerId: true } },
        { desc: 'huge string name', body: { name: hugeString } },
        { desc: 'object where string expected (name is object)', body: { name: { nested: true } } },
      ],
    },
    // 4. PUT /users/me/skills
    {
      name: 'PUT /users/me/skills',
      method: 'PUT',
      url: '/users/me/skills',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (skills is string not array)', body: { skills: 'python' } },
        { desc: 'wrong type (proficiency > 4)', body: { skills: [{ skillSlug: 'python', proficiency: 99 }] } },
        { desc: 'object where string expected (skillSlug is object)', body: { skills: [{ skillSlug: { name: 'python' }, proficiency: 3 }] } },
      ],
    },
    // 5. PATCH /users/me/skills/:slug
    {
      name: 'PATCH /users/me/skills/:slug',
      method: 'PATCH',
      url: '/users/me/skills/python',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (proficiency is string)', body: { proficiency: 'expert' } },
        { desc: 'wrong type (proficiency out of bounds)', body: { proficiency: -5 } },
        { desc: 'object where number expected', body: { proficiency: { level: 3 } } },
      ],
    },
    // 6. POST /analysis/what-if
    {
      name: 'POST /analysis/what-if',
      method: 'POST',
      url: '/analysis/what-if',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (careerSlug is number)', body: { careerSlug: 12345 } },
        { desc: 'huge string careerSlug', body: { careerSlug: hugeString } },
        { desc: 'object where string expected', body: { careerSlug: { slug: 'ai-engineer' } } },
      ],
    },
    // 7. POST /admin/skills
    {
      name: 'POST /admin/skills',
      method: 'POST',
      url: '/admin/skills',
      cookie: adminCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (difficulty is string)', body: { slug: 'bad-skill', name: 'Bad Skill', category: 'tools', difficulty: 'hard' } },
        { desc: 'huge string name', body: { slug: 'bad-skill', name: hugeString, category: 'tools', difficulty: 3 } },
        { desc: 'object where string expected (slug is object)', body: { slug: { val: 'bad' }, name: 'Bad Skill', category: 'tools', difficulty: 3 } },
      ],
    },
    // 8. PATCH /admin/skills/:slug
    {
      name: 'PATCH /admin/skills/:slug',
      method: 'PATCH',
      url: '/admin/skills/python',
      cookie: adminCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (difficulty is string)', body: { difficulty: 'invalid' } },
        { desc: 'huge string description', body: { description: hugeString } },
        { desc: 'object where string expected (category is object)', body: { category: { cat: 'tools' } } },
      ],
    },
    // 9. POST /admin/relationships
    {
      name: 'POST /admin/relationships',
      method: 'POST',
      url: '/admin/relationships',
      cookie: adminCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (relationshipType is invalid enum)', body: { sourceSkillId: '6ac88e9d3d19fbf898c1345d', targetSkillId: '6ac88e9d3d19fbf898c1345e', relationshipType: 'friends' } },
        { desc: 'wrong type (strength is string)', body: { sourceSkillId: '6ac88e9d3d19fbf898c1345d', targetSkillId: '6ac88e9d3d19fbf898c1345e', relationshipType: 'prerequisite', strength: 'high' } },
        { desc: 'object where string expected (sourceSkillId is object)', body: { sourceSkillId: { id: 1 }, targetSkillId: '6ac88e9d3d19fbf898c1345e', relationshipType: 'prerequisite' } },
      ],
    },
    // 10. POST /admin/careers
    {
      name: 'POST /admin/careers',
      method: 'POST',
      url: '/admin/careers',
      cookie: adminCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (salaryRange is number)', body: { slug: 'test-career', name: 'Test Career', salaryRange: 12345 } },
        { desc: 'huge string name', body: { slug: 'test-career', name: hugeString } },
        { desc: 'object where string expected (name is object)', body: { slug: 'test-career', name: { val: 'Test' } } },
      ],
    },
    // 11. PATCH /admin/careers/:slug
    {
      name: 'PATCH /admin/careers/:slug',
      method: 'PATCH',
      url: '/admin/careers/machine-learning-engineer',
      cookie: adminCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (isActive is string)', body: { isActive: 'yes' } },
        { desc: 'huge string description', body: { description: hugeString } },
        { desc: 'object where string expected (salaryRange is object)', body: { salaryRange: { min: 10 } } },
      ],
    },
    // 12. PUT /admin/careers/:slug/skills
    {
      name: 'PUT /admin/careers/:slug/skills',
      method: 'PUT',
      url: '/admin/careers/machine-learning-engineer/skills',
      cookie: adminCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (skills is object not array)', body: { skills: { skillSlug: 'python' } } },
        { desc: 'wrong type (requiredLevel > 4)', body: { skills: [{ skillSlug: 'python', importance: 'core', requiredLevel: 99 }] } },
        { desc: 'object where string expected (importance is object)', body: { skills: [{ skillSlug: 'python', importance: { imp: 'core' }, requiredLevel: 3 }] } },
      ],
    },
    // 13. POST /ai/chat
    {
      name: 'POST /ai/chat',
      method: 'POST',
      url: '/ai/chat',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (message is number)', body: { message: 12345 } },
        { desc: 'huge string message', body: { message: hugeString } },
        { desc: 'object where string expected (message is object)', body: { message: { text: 'hello' } } },
      ],
    },
    // 14. POST /ai/explain
    {
      name: 'POST /ai/explain',
      method: 'POST',
      url: '/ai/explain',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (topic is boolean)', body: { topic: true } },
        { desc: 'huge string topic', body: { topic: hugeString } },
        { desc: 'object where string expected (topic is object)', body: { topic: { term: 'python' } } },
      ],
    },
    // 15. PUT /settings/llm
    {
      name: 'PUT /settings/llm',
      method: 'PUT',
      url: '/settings/llm',
      cookie: studentCookie,
      cases: [
        { desc: 'empty body', body: {} },
        { desc: 'wrong type (openRouterApiKey is boolean)', body: { openRouterApiKey: true } },
        { desc: 'huge string model', body: { preferredModel: hugeString } },
        { desc: 'object where string expected (preferredModel is object)', body: { preferredModel: { name: 'gpt-4' } } },
      ],
    },
  ];

  const results = [];
  let totalCases = 0;
  let passedCases = 0;
  let server500Count = 0;

  for (const tc of testCases) {
    for (const c of tc.cases) {
      totalCases++;
      const headers = {};
      if (tc.cookie) {
        headers['Cookie'] = tc.cookie;
      }

      const res = await request(tc.url, {
        method: tc.method,
        headers,
        body: JSON.stringify(c.body),
      });

      const is400 = res.status === 400;
      const is500 = res.status >= 500;
      const isValidationErr = res.data?.error?.code === 'VALIDATION_ERROR';

      if (is500) {
        server500Count++;
      }

      const ok = is400 && isValidationErr;
      if (ok) passedCases++;

      results.push({
        endpoint: tc.name,
        test: c.desc,
        status: res.status,
        code: res.data?.error?.code || 'NONE',
        ok: ok ? 'OK' : 'FAIL',
      });
    }
  }

  console.log('='.repeat(100));
  console.log('                            BAD-INPUT SWEEP TABLE                                ');
  console.log('='.repeat(100));
  console.log('| Endpoint                         | Bad-Input Test Case                    | Status | Error Code       | Result |');
  console.log('|----------------------------------|----------------------------------------|--------|------------------|--------|');
  for (const r of results) {
    const ep = r.endpoint.padEnd(32);
    const test = r.test.padEnd(38);
    const status = String(r.status).padEnd(6);
    const code = (r.code || '').padEnd(16);
    const result = r.ok.padEnd(6);
    console.log(`| ${ep} | ${test} | ${status} | ${code} | ${result} |`);
  }
  console.log('='.repeat(100));
  console.log(`\nSummary: ${totalCases} test cases executed.`);
  console.log(`Passed (400 VALIDATION_ERROR): ${passedCases}/${totalCases}`);
  console.log(`500 Server Errors: ${server500Count}`);

  if (server500Count > 0) {
    console.error(`\nFAIL: Encountered ${server500Count} 500 Internal Server Errors!`);
    process.exit(1);
  } else if (passedCases < totalCases) {
    console.warn(`\nWARNING: ${totalCases - passedCases} test cases did not return 400 VALIDATION_ERROR.`);
  } else {
    console.log(`\nALL BAD-INPUT TESTS PASSED WITH 400 VALIDATION_ERROR AND ZERO 500s!`);
  }
}

run().catch((err) => {
  console.error('Fatal error during bad-input sweep:', err);
  process.exit(1);
});
