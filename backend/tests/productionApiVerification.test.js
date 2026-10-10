import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import * as models from '../src/models/index.js';
import { seedKnowledgeBase } from '../seed/seed.js';
import { seedDemoUsers } from '../seed/seedDemo.js';
import { loadSeedFiles } from '../seed/loadSeedFiles.js';
import { invalidateCareerModels } from '../src/services/careerModel.service.js';
import { COOKIE_NAME } from '../src/utils/authCookie.js';
import { isAllowedOrigin } from '../src/middleware/csrf.js';

const { Skill, SkillRelationship, Career, CareerSkill, User, UserSkill, AlignmentSnapshot, UserProgress } = models;

let mongoServer = null;
let authTokenCookie = '';
let csrfToken = '';

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

  // Seed Knowledge Base and Demo Users
  const seedData = loadSeedFiles();
  await seedKnowledgeBase({ models, data: seedData });
  await seedDemoUsers({ models });

  invalidateCareerModels();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Production API & Credentialed CORS Verification', () => {
  describe('CORS Origin Restriction & Credentials', () => {
    it('allows requests from configured CLIENT_ORIGIN with credentials', async () => {
      const allowedOrigin = 'http://localhost:5173';
      const res = await request(app)
        .get('/api/meta')
        .set('Origin', allowedOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects CORS for untrusted origins by omitting Access-Control-Allow-Origin', async () => {
      const untrustedOrigin = 'https://malicious-site.com';
      const res = await request(app)
        .get('/api/meta')
        .set('Origin', untrustedOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('validates allowed origins with custom domains and subdomains', () => {
      const config = 'https://skillgraph.vercel.app, https://*.vercel.app, http://localhost:5173';
      expect(isAllowedOrigin('https://skillgraph.vercel.app', config)).toBe(true);
      expect(isAllowedOrigin('https://skillgraph-preview-123.vercel.app', config)).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173', config)).toBe(true);
      expect(isAllowedOrigin('https://evil-phishing.com', config)).toBe(false);
    });
  });

  describe('Core API Endpoints Verification (No Mocks)', () => {
    it('1. Login: POST /api/auth/login authenticates and returns user + auth cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'prabha@demo.skillgraph.dev',
          password: 'DemoStudent123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('prabha@demo.skillgraph.dev');

      const setCookies = res.headers['set-cookie'];
      expect(setCookies).toBeDefined();
      const authCookie = setCookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();

      authTokenCookie = authCookie.split(';')[0];
      csrfToken = res.headers['x-csrf-token'] || '';
    });

    it('2. Profile: GET /api/users/me and GET /api/users/me/skills return real user profile and skill ratings', async () => {
      const meRes = await request(app)
        .get('/api/users/me')
        .set('Cookie', authTokenCookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.name).toBe('Prabha');
      expect(meRes.body.data.user.semester).toBe(5);

      const skillsRes = await request(app)
        .get('/api/users/me/skills')
        .set('Cookie', authTokenCookie);

      expect(skillsRes.status).toBe(200);
      expect(skillsRes.body.success).toBe(true);
      expect(Array.isArray(skillsRes.body.data.items)).toBe(true);
      expect(skillsRes.body.data.items.length).toBeGreaterThan(0);
    });

    it('3. Graph: GET /api/analysis/graph returns nodes, edges, and career layout metadata', async () => {
      const res = await request(app)
        .get('/api/analysis/graph')
        .set('Cookie', authTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nodes).toBeDefined();
      expect(Array.isArray(res.body.data.nodes)).toBe(true);
      expect(res.body.data.nodes.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.edges)).toBe(true);
    });

    it('4. Learning Path: GET /api/analysis/learning-path returns topologically sorted steps', async () => {
      const res = await request(app)
        .get('/api/analysis/learning-path')
        .set('Cookie', authTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.steps)).toBe(true);
      expect(res.body.data.steps.length).toBeGreaterThan(0);
      expect(res.body.data.totalEffortPoints).toBeGreaterThan(0);
    });

    it('5. Analytics: GET /api/analysis/insights returns category distribution and alignment history', async () => {
      const res = await request(app)
        .get('/api/analysis/insights')
        .set('Cookie', authTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categoryDistribution)).toBe(true);
      expect(Array.isArray(res.body.data.alignmentHistory)).toBe(true);
      expect(Array.isArray(res.body.data.topMissingSkills)).toBe(true);
    });

    it('6. Settings: GET and PUT /api/settings/llm manages LLM preference and model settings', async () => {
      const getRes = await request(app)
        .get('/api/settings/llm')
        .set('Cookie', authTokenCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data).toHaveProperty('hasKey');

      const putRes = await request(app)
        .put('/api/settings/llm')
        .set('Cookie', authTokenCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          model: 'google/gemini-2.0-flash-exp:free',
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);
      expect(putRes.body.data.model).toBe('google/gemini-2.0-flash-exp:free');
    });
  });
});
