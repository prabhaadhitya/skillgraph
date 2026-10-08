import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import * as models from '../src/models/index.js';
import { seedKnowledgeBase } from '../seed/seed.js';
import { seedDemoUsers } from '../seed/seedDemo.js';
import { loadSeedFiles } from '../seed/loadSeedFiles.js';
import { invalidateCareerModels } from '../src/services/careerModel.service.js';

const { User, Skill, Career, CareerSkill, UserSkill, AlignmentSnapshot, UserProgress, SkillRelationship } = models;

let mongoServer = null;
let prabhaCookie = '';
let studentCookie = '';
let adminCookie = '';
let seededStudents = [];

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
  invalidateCareerModels();

  // Create an explicit admin user
  const adminHash = await bcrypt.hash('AdminSecret123!', 12);
  await User.create({
    name: 'Admin Officer',
    email: 'admin@demo.skillgraph.dev',
    passwordHash: adminHash,
    role: 'admin',
    onboardingCompleted: true,
  });

  // Log in as prabha (seeded student with multiple snapshots)
  const prabhaRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'prabha@demo.skillgraph.dev',
      password: 'DemoStudent123!',
    });
  expect(prabhaRes.status).toBe(200);
  prabhaCookie = prabhaRes.headers['set-cookie'][0];

  // Register a fresh student (0 snapshots initially)
  const studentRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Fresh Student',
      email: 'freshstudent@test.dev',
      password: 'Password123!',
    });
  expect(studentRes.status).toBe(201);
  studentCookie = studentRes.headers['set-cookie'][0];

  // Log in as admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@demo.skillgraph.dev',
      password: 'AdminSecret123!',
    });
  expect(adminRes.status).toBe(200);
  adminCookie = adminRes.headers['set-cookie'][0];

  // Fetch all student records for PII assertion
  seededStudents = await User.find({ role: 'student' }).lean();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Student Analytics (/api/analysis/insights)', () => {
  it('returns 401 when not logged in', async () => {
    const res = await request(app).get('/api/analysis/insights');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns student insights for seeded persona prabha with category distribution, alignment history, and top missing skills', async () => {
    const res = await request(app)
      .get('/api/analysis/insights')
      .set('Cookie', prabhaCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    // 1. Category Distribution
    expect(Array.isArray(data.categoryDistribution)).toBe(true);
    expect(data.categoryDistribution.length).toBeGreaterThan(0);
    const firstCat = data.categoryDistribution[0];
    expect(firstCat).toHaveProperty('category');
    expect(firstCat).toHaveProperty('name');
    expect(firstCat).toHaveProperty('skills');
    expect(firstCat).toHaveProperty('avgLevel');
    expect(typeof firstCat.avgLevel).toBe('number');
    // Also aliases
    expect(data.skillsByCategory).toEqual(data.categoryDistribution);

    // 2. Alignment History (prabha has >= 2 seeded snapshots)
    expect(Array.isArray(data.alignmentHistory)).toBe(true);
    expect(data.alignmentHistory.length).toBeGreaterThanOrEqual(2);
    const firstHist = data.alignmentHistory[0];
    expect(firstHist).toHaveProperty('at');
    expect(firstHist).toHaveProperty('fitScore');
    expect(typeof firstHist.fitScore).toBe('number');
    expect(res.body.meta?.empty).toBeUndefined();

    // 3. Top Missing Skills
    expect(Array.isArray(data.topMissing)).toBe(true);
    expect(data.topMissing.length).toBeLessThanOrEqual(5);
    expect(data.topMissing.length).toBeGreaterThan(0);
    const firstMissing = data.topMissing[0];
    expect(firstMissing).toHaveProperty('skill');
    expect(firstMissing.skill).toHaveProperty('slug');
    expect(firstMissing.skill).toHaveProperty('name');
    expect(firstMissing).toHaveProperty('gap');
    expect(firstMissing).toHaveProperty('importance');
    expect(firstMissing).toHaveProperty('priority');
    expect(data.topMissingSkills).toEqual(data.topMissing);
  });

  it('returns empty array and meta.empty = true when student has fewer than 2 snapshots', async () => {
    const res = await request(app)
      .get('/api/analysis/insights')
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alignmentHistory).toEqual([]);
    expect(res.body.meta).toEqual({ empty: true });
  });
});

describe('Admin Analytics Role Guards (A6)', () => {
  const adminEndpoints = [
    '/api/admin/analytics/overview',
    '/api/admin/analytics/skill-gaps',
    '/api/admin/analytics/career-distribution',
    '/api/admin/analytics/skill-popularity',
    '/api/admin/analytics/semester-distribution',
  ];

  it('rejects unauthenticated requests with 401', async () => {
    for (const ep of adminEndpoints) {
      const res = await request(app).get(ep);
      expect(res.status, `Expected 401 for ${ep}`).toBe(401);
    }
  });

  it('rejects student requests with 403 on every admin route (A6)', async () => {
    for (const ep of adminEndpoints) {
      const res = await request(app)
        .get(ep)
        .set('Cookie', prabhaCookie);
      expect(res.status, `Expected 403 for ${ep} with student role`).toBe(403);
      expect(res.body.success).toBe(false);
    }
  });
});

describe('Admin Aggregate Analytics Endpoints', () => {
  it('GET /api/admin/analytics/overview returns totals and average fit score', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    expect(typeof data.totalStudents).toBe('number');
    expect(data.totalStudents).toBeGreaterThanOrEqual(4); // prabha, asha, ravi, newbie, freshstudent
    expect(typeof data.onboardedStudents).toBe('number');
    expect(data.onboardedStudents).toBeGreaterThan(0);
    expect(typeof data.avgFitScore).toBe('number');
    expect(data.totalSkills).toBe(71);
    expect(data.totalCareers).toBe(5);
  });

  it('GET /api/admin/analytics/skill-gaps returns top skills with % gap and avg gap', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/skill-gaps?limit=10')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeLessThanOrEqual(10);
    expect(data.items.length).toBeGreaterThan(0);

    const firstItem = data.items[0];
    expect(firstItem).toHaveProperty('skill');
    expect(firstItem.skill).toHaveProperty('id');
    expect(firstItem.skill).toHaveProperty('slug');
    expect(firstItem.skill).toHaveProperty('name');
    expect(firstItem).toHaveProperty('percentWithGap');
    expect(firstItem).toHaveProperty('avgGap');
    expect(firstItem).toHaveProperty('studentsConsidered');
    expect(typeof firstItem.percentWithGap).toBe('number');
    expect(typeof firstItem.avgGap).toBe('number');
    expect(firstItem.studentsConsidered).toBeGreaterThan(0);
  });

  it('GET /api/admin/analytics/career-distribution returns students and percentages by career', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/career-distribution')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBe(5);

    for (const item of data.items) {
      expect(item).toHaveProperty('career');
      expect(item.career).toHaveProperty('slug');
      expect(item.career).toHaveProperty('name');
      expect(typeof item.students).toBe('number');
      expect(typeof item.percent).toBe('number');
    }
  });

  it('GET /api/admin/analytics/skill-popularity returns popularity ranks by student count', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/skill-popularity?limit=5')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeLessThanOrEqual(5);
    expect(data.items.length).toBeGreaterThan(0);

    const first = data.items[0];
    expect(first).toHaveProperty('skill');
    expect(first.skill).toHaveProperty('slug');
    expect(first).toHaveProperty('students');
    expect(first).toHaveProperty('avgProficiency');
    expect(typeof first.avgProficiency).toBe('number');
  });

  it('GET /api/admin/analytics/semester-distribution returns distribution by semester', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/semester-distribution')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    expect(Array.isArray(data.items)).toBe(true);
    for (const item of data.items) {
      expect(typeof item.semester).toBe('number');
      expect(typeof item.students).toBe('number');
      expect(typeof item.avgFitScore).toBe('number');
      expect(typeof item.avgSkillsPerStudent).toBe('number');
    }
  });

  it('SECURITY: asserts admin responses contain NO student names, emails, or student IDs (aggregates only)', async () => {
    const adminEndpoints = [
      '/api/admin/analytics/overview',
      '/api/admin/analytics/skill-gaps',
      '/api/admin/analytics/career-distribution',
      '/api/admin/analytics/skill-popularity',
      '/api/admin/analytics/semester-distribution',
    ];

    for (const ep of adminEndpoints) {
      const res = await request(app)
        .get(ep)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const bodyStr = JSON.stringify(res.body);

      // Verify no student emails or names appear in the payload
      for (const student of seededStudents) {
        expect(bodyStr).not.toContain(student.email);
        expect(bodyStr).not.toContain(student.name);
        expect(bodyStr).not.toContain(student._id.toString());
      }
    }
  });
});
