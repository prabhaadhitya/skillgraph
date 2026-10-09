import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import * as models from '../src/models/index.js';
import { seedKnowledgeBase } from '../seed/seed.js';
import { seedDemoUsers } from '../seed/seedDemo.js';
import { loadSeedFiles } from '../seed/loadSeedFiles.js';
import { invalidateCareerModels } from '../src/services/careerModel.service.js';
import { mlClient } from '../src/services/mlClient.js';

const { Skill, SkillRelationship, Career, CareerSkill, User, UserSkill, AlignmentSnapshot, UserProgress } = models;

let mongoServer = null;
let prabhaCookie = '';
let newbieCookie = '';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  // Clean collections
  await Promise.all([
    Skill.deleteMany({}),
    SkillRelationship.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    User.deleteMany({}),
    UserSkill.deleteMany({}),
    AlignmentSnapshot.deleteMany({}),
    UserProgress.deleteMany({}),
  ]);

  // Seed Knowledge Base & Demo Personas
  const seedData = loadSeedFiles();
  await seedKnowledgeBase({ models, data: seedData });
  await seedDemoUsers({ models });

  // Invalidate any cached career models
  invalidateCareerModels();

  // Mock ML service as unavailable for deterministic rule-based engine tests
  vi.spyOn(mlClient, 'recommend').mockResolvedValue(null);

  // Log in as prabha (seeded demo user)
  const prabhaLoginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'prabha@demo.skillgraph.dev',
      password: 'DemoStudent123!',
    });
  expect(prabhaLoginRes.status).toBe(200);
  prabhaCookie = prabhaLoginRes.headers['set-cookie'][0];


  const noCareerLoginRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'No Career Student 2',
      email: 'nocareer2@test.dev',
      password: 'Password123!',
    });
  expect(noCareerLoginRes.status).toBe(201);
  newbieCookie = noCareerLoginRes.headers['set-cookie'][0];
});

afterAll(async () => {
  try {
    await Promise.all([
      Skill.deleteMany({}),
      SkillRelationship.deleteMany({}),
      Career.deleteMany({}),
      CareerSkill.deleteMany({}),
      User.deleteMany({}),
      UserSkill.deleteMany({}),
      AlignmentSnapshot.deleteMany({}),
      UserProgress.deleteMany({}),
    ]);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe('Analysis Endpoints (/api/analysis)', () => {
  describe('Authentication & Career Resolution', () => {
    it('returns 401 UNAUTHENTICATED when not logged in', async () => {
      const res = await request(app).get('/api/analysis/skill-gap');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 422 RULE_VIOLATION when user has no target career and query param is absent', async () => {
      const res = await request(app)
        .get('/api/analysis/skill-gap')
        .set('Cookie', newbieCookie);
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RULE_VIOLATION');
      expect(res.body.error.message).toMatch(/no career specified/i);
    });

    it('succeeds for user without target career when ?career=<slug> query param is provided', async () => {
      const res = await request(app)
        .get('/api/analysis/skill-gap?career=machine-learning-engineer')
        .set('Cookie', newbieCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.career.slug).toBe('machine-learning-engineer');
    });
  });

  describe('GET /api/analysis/skill-gap (Prabha & A13)', () => {
    it('returns seeded prabha skill gap with fit 26 and summary 6/5/24/35', async () => {
      const res = await request(app)
        .get('/api/analysis/skill-gap')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { career, summary, items } = res.body.data;
      expect(career.slug).toBe('machine-learning-engineer');
      expect(career.name).toBe('Machine Learning Engineer');

      // Golden counts for prabha
      expect(summary.strong).toBe(6);
      expect(summary.developing).toBe(5);
      expect(summary.missing).toBe(24);
      expect(summary.total).toBe(35);

      // A13: summary counts add up
      expect(summary.strong + summary.developing + summary.missing).toBe(summary.total);

      // Items structure and ordering (gap items sorted by priority desc)
      expect(items.length).toBe(35);
      const firstItem = items[0];
      expect(firstItem.skill.slug).toBeDefined();
      expect(firstItem.proficiency).toBeDefined();
      expect(firstItem.requiredLevel).toBeDefined();
      expect(firstItem.gap).toBeDefined();
      expect(firstItem.status).toBeDefined();
    });
  });

  describe('GET /api/analysis/career-fit', () => {
    it('returns estimated career alignment score, band, breakdown, and weights', async () => {
      const res = await request(app)
        .get('/api/analysis/career-fit')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.career.slug).toBe('machine-learning-engineer');
      expect(data.label).toBe('Estimated career alignment');
      expect(data.fitScore).toBe(26);
      expect(data.band).toBe('early');

      expect(data.breakdown).toBeDefined();
      expect(typeof data.breakdown.coverage).toBe('number');
      expect(typeof data.breakdown.prerequisiteReadiness).toBe('number');

      expect(data.weights).toEqual({
        coverage: 0.85,
        prerequisiteReadiness: 0.15,
      });
    });
  });

  describe('GET /api/analysis/learning-path (E11b step 1)', () => {
    it('returns learning path with 29 steps, 259 effort points, and step 1 is statistics', async () => {
      const res = await request(app)
        .get('/api/analysis/learning-path')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.career.slug).toBe('machine-learning-engineer');
      expect(data.totalSteps).toBe(29);
      expect(data.totalEffortPoints).toBe(259);
      expect(data.steps).toHaveLength(29);

      // Step 1 check
      const step1 = data.steps[0];
      expect(step1.order).toBe(1);
      expect(step1.skill.slug).toBe('statistics');
      expect(step1.skill.name).toBe('Statistics');
      expect(step1.fromLevel).toBe(1);
      expect(step1.toLevel).toBe(4);
      expect(step1.isReadyNow).toBe(true);
      expect(step1.priority).toBe(0.84);
      expect(step1.effortPoints).toBe(9);
      expect(step1.reasons).toEqual(expect.arrayContaining(['HIGH_IMPORTANCE', 'LARGE_GAP', 'UNLOCKS_MANY']));
    });
  });

  describe('GET /api/analysis/graph', () => {
    it('returns career subgraph nodes and edges matching PREREQUISITE only by default', async () => {
      const res = await request(app)
        .get('/api/analysis/graph')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.career.slug).toBe('machine-learning-engineer');
      expect(data.nodes).toHaveLength(35);
      expect(data.edges).toHaveLength(40);
      expect(data.stats).toEqual({ nodes: 35, edges: 40 });

      // Node state check
      const statsNode = data.nodes.find((n) => n.slug === 'statistics');
      expect(statsNode).toBeDefined();
      expect(statsNode.state).toBe('recommended'); // In top 3 next skills

      const pythonNode = data.nodes.find((n) => n.slug === 'python');
      expect(pythonNode).toBeDefined();
      expect(pythonNode.state).toBe('mastered');

      // Verify all edges are PREREQUISITE
      expect(data.edges.every((e) => e.type === 'PREREQUISITE')).toBe(true);
    });

    it('includes RELATED_TO edges when ?related=true', async () => {
      const res = await request(app)
        .get('/api/analysis/graph?related=true')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.stats.edges).toBeGreaterThanOrEqual(40);
      const hasRelated = data.edges.some((e) => e.type === 'RELATED_TO');
      expect(hasRelated).toBe(true);
    });
  });

  describe('GET /api/analysis/dashboard (E11b & fixtures)', () => {
    it('returns full dashboard aggregation matching prabha fixture', async () => {
      const res = await request(app)
        .get('/api/analysis/dashboard')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.user.name).toBe('Prabha');
      expect(data.career.slug).toBe('machine-learning-engineer');

      // Fit card
      expect(data.fit.score).toBe(26);
      expect(data.fit.previousScore).toBe(19);
      expect(data.fit.delta).toBe(7);
      expect(data.fit.band).toBe('early');

      // Summary
      expect(data.summary).toEqual({
        strong: 6,
        developing: 5,
        missing: 24,
        total: 35,
      });

      // Next skills
      expect(data.nextSkills).toHaveLength(3);
      expect(data.strategy).toBe('rule');

      // E11b: next skill #1 equals learning-path step 1
      expect(data.nextSkills[0].skill.slug).toBe('statistics');
      expect(data.nextSkills[0].score).toBe(0.84);
      expect(data.nextSkills[0].reasons).toEqual(expect.arrayContaining(['HIGH_IMPORTANCE', 'LARGE_GAP', 'UNLOCKS_MANY']));

      // Top gaps
      expect(data.topGaps).toHaveLength(5);
      expect(data.topGaps[0].skill.slug).toBe('statistics');
      expect(data.topGaps[0].gap).toBe(3);
      expect(data.topGaps[0].status).toBe('critical');

      expect(data.updatedAt).toBeDefined();
    });
  });

  describe('POST /api/analysis/what-if', () => {
    it('returns comparison against alternative career without mutating user target career', async () => {
      const res = await request(app)
        .post('/api/analysis/what-if')
        .set('Cookie', prabhaCookie)
        .send({ careerSlug: 'data-scientist' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.current.career.slug).toBe('machine-learning-engineer');
      expect(data.current.fitScore).toBe(26);
      expect(data.current.pathSteps).toBe(29);
      expect(data.current.topPriority.length).toBeGreaterThan(0);

      expect(data.alternative.career.slug).toBe('data-scientist');
      expect(data.alternative.fitScore).toBeGreaterThan(0);
      expect(data.alternative.pathSteps).toBeGreaterThan(0);
      expect(data.alternative.topPriority.length).toBeGreaterThan(0);

      expect(data.delta).toBe(data.alternative.fitScore - data.current.fitScore);
      expect(Array.isArray(data.newlyRequired)).toBe(true);
      expect(Array.isArray(data.noLongerRequired)).toBe(true);

      // Verify prabha's target career in DB has NOT been altered
      const user = await User.findOne({ email: 'prabha@demo.skillgraph.dev' }).populate('targetCareerId');
      expect(user.targetCareerId.slug).toBe('machine-learning-engineer');
    });

    it('returns 400 when careerSlug is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/analysis/what-if')
        .set('Cookie', prabhaCookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/analysis/career-compare', () => {
    it('returns common and unique skills between career A and B matching API shape', async () => {
      const res = await request(app)
        .get('/api/analysis/career-compare?a=data-scientist&b=machine-learning-engineer')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.a.career.slug).toBe('data-scientist');
      expect(data.a.fitScore).toBeDefined();
      expect(data.a.pathSteps).toBeDefined();
      expect(data.a.effortPoints).toBeDefined();
      expect(data.a.missingCount).toBeDefined();

      expect(data.b.career.slug).toBe('machine-learning-engineer');
      expect(data.b.fitScore).toBe(26);
      expect(data.b.pathSteps).toBe(29);
      expect(data.b.effortPoints).toBe(259);
      expect(data.b.missingCount).toBe(24);

      expect(Array.isArray(data.common)).toBe(true);
      expect(Array.isArray(data.uniqueToA)).toBe(true);
      expect(Array.isArray(data.uniqueToB)).toBe(true);

      // Python is common to both
      const pythonCommon = data.common.find((c) => c.skill.slug === 'python');
      expect(pythonCommon).toBeDefined();
      expect(pythonCommon.a.requiredLevel).toBeDefined();
      expect(pythonCommon.b.requiredLevel).toBeDefined();
    });

    it('returns 400 when parameter a or b is missing', async () => {
      const res = await request(app)
        .get('/api/analysis/career-compare?a=data-scientist')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 with friendly message when comparing a career with itself', async () => {
      const res = await request(app)
        .get('/api/analysis/career-compare?a=machine-learning-engineer&b=machine-learning-engineer')
        .set('Cookie', prabhaCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const detail = res.body.error.details?.find((d) => d.field === 'b');
      expect(detail?.message).toMatch(/cannot compare a career with itself/i);
    });
  });

  describe('A14: After skill PATCH dashboard score changes and previousScore is present', () => {
    it('updates skill level, recalculates alignment, and reflects in dashboard', async () => {
      // 1. Initial dashboard score is 26 with previousScore 19
      const dashBefore = await request(app)
        .get('/api/analysis/dashboard')
        .set('Cookie', prabhaCookie);
      expect(dashBefore.body.data.fit.score).toBe(26);

      // Age prior snapshot to > 60s ago so patch creates a new snapshot
      const prabhaUser = await User.findOne({ email: 'prabha@demo.skillgraph.dev' });
      await AlignmentSnapshot.collection.updateMany(
        { userId: prabhaUser._id, fitScore: 26 },
        { $set: { createdAt: new Date(Date.now() - 120 * 1000) } },
      );

      // 2. PATCH Statistics from level 1 to level 4
      const patchRes = await request(app)
        .patch('/api/users/me/skills/statistics')
        .set('Cookie', prabhaCookie)
        .send({ proficiency: 4 });
      expect(patchRes.status).toBe(200);

      // Invalidate career models cache if needed
      invalidateCareerModels();

      // 3. New dashboard call shows updated score > 26 and previousScore is 26
      const dashAfter = await request(app)
        .get('/api/analysis/dashboard')
        .set('Cookie', prabhaCookie);

      expect(dashAfter.status).toBe(200);
      const fitAfter = dashAfter.body.data.fit;
      expect(fitAfter.score).toBeGreaterThan(26);
      expect(fitAfter.previousScore).toBe(26);
      expect(fitAfter.delta).toBe(fitAfter.score - 26);
    });
  });
});
