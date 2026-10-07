import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { SkillRelationship } from '../src/models/skillRelationship.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { requireRole } from '../src/middleware/requireRole.js';
import { auth } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { respond } from '../src/utils/respond.js';

let mongoServer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  // Clear collections
  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    SkillRelationship.deleteMany({}),
    UserSkill.deleteMany({}),
  ]);

  // Seed sample catalog data for tests
  const python = await Skill.create({
    slug: 'python',
    name: 'Python',
    description: 'Python programming language',
    category: 'programming',
    difficulty: 2,
  });

  const statistics = await Skill.create({
    slug: 'statistics',
    name: 'Statistics',
    description: 'Statistical concepts',
    category: 'data-analytics',
    difficulty: 3,
  });

  const ml = await Skill.create({
    slug: 'machine-learning-fundamentals',
    name: 'Machine Learning Fundamentals',
    description: 'Core ML algorithms',
    category: 'machine-learning',
    difficulty: 4,
  });

  const pandas = await Skill.create({
    slug: 'pandas',
    name: 'Pandas',
    description: 'Data manipulation',
    category: 'data-analytics',
    difficulty: 2,
  });

  // Relationships: python -> statistics -> ml (prerequisites); pandas related to statistics
  await SkillRelationship.create([
    {
      sourceSkillId: python._id,
      targetSkillId: statistics._id,
      relationshipType: 'PREREQUISITE',
    },
    {
      sourceSkillId: statistics._id,
      targetSkillId: ml._id,
      relationshipType: 'PREREQUISITE',
    },
    {
      sourceSkillId: pandas._id,
      targetSkillId: statistics._id,
      relationshipType: 'RELATED_TO',
    },
  ]);

  // Careers
  const mle = await Career.create({
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    description: 'Build ML systems',
    category: 'ai',
    icon: 'brain',
    isActive: true,
  });

  const ds = await Career.create({
    slug: 'data-scientist',
    name: 'Data Scientist',
    description: 'Extract insights from data',
    category: 'data',
    icon: 'bar-chart',
    isActive: true,
  });

  // Career skills
  await CareerSkill.create([
    {
      careerId: mle._id,
      skillId: python._id,
      importance: 0.9,
      requiredLevel: 4,
    },
    {
      careerId: mle._id,
      skillId: statistics._id,
      importance: 0.8,
      requiredLevel: 4,
    },
    {
      careerId: ds._id,
      skillId: statistics._id,
      importance: 0.8,
      requiredLevel: 4,
    },
  ]);
});

afterAll(async () => {
  try {
    await Promise.all([
      User.deleteMany({}),
      Skill.deleteMany({}),
      Career.deleteMany({}),
      CareerSkill.deleteMany({}),
      SkillRelationship.deleteMany({}),
      UserSkill.deleteMany({}),
    ]);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe('Auth & Catalog Integration Tests', () => {
  let studentCookie = '';
  let studentId = '';

  it('register ok, cookie set, envelope present, and no passwordHash in response', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.name).toBe('Ravi Kumar');
    expect(res.body.data.user.email).toBe('ravi@example.com');
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    // Cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('sg_token='))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);

    studentCookie = cookies.find((c) => c.startsWith('sg_token='));
    studentId = res.body.data.user.id;
  });

  it('registering duplicate email returns 409 CONFLICT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ravi Duplicate',
      email: 'ravi@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('registering with {"role":"admin"} is 400 VALIDATION_ERROR due to strict schema', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker Admin',
      email: 'hacker@example.com',
      password: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('wrong password and unknown email give identical 401 message', async () => {
    const resWrongPass = await request(app).post('/api/auth/login').send({
      email: 'ravi@example.com',
      password: 'WrongPassword999',
    });

    const resUnknownEmail = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'AnyPassword123',
    });

    expect(resWrongPass.status).toBe(401);
    expect(resUnknownEmail.status).toBe(401);
    expect(resWrongPass.body.success).toBe(false);
    expect(resUnknownEmail.body.success).toBe(false);
    expect(resWrongPass.body.error.code).toBe('UNAUTHENTICATED');
    expect(resUnknownEmail.body.error.code).toBe('UNAUTHENTICATED');
    expect(resWrongPass.body.error.message).toBe('Invalid email or password');
    expect(resUnknownEmail.body.error.message).toBe('Invalid email or password');
  });

  it('/api/auth/me without cookie is 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('/api/auth/me with valid cookie returns user object', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [studentCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(studentId);
    expect(res.body.data.user.email).toBe('ravi@example.com');
  });

  it('a student gets 403 on a route protected by requireRole("admin")', async () => {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.get('/test-admin-only', auth, requireRole('admin'), (req, res) => {
      respond.ok(res, { secret: 'admin-area' });
    });
    testApp.use(errorHandler);

    const res = await request(testApp)
      .get('/test-admin-only')
      .set('Cookie', [studentCookie]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/users/me validates semester 9 -> 400', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', [studentCookie])
      .send({ semester: 9 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/users/me validates unknown career -> 404', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', [studentCookie])
      .send({ targetCareerSlug: 'nonexistent-career-slug' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/users/me validates onboardingCompleted without career -> 422 RULE_VIOLATION', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', [studentCookie])
      .send({ onboardingCompleted: true });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RULE_VIOLATION');
  });

  it('PATCH /api/users/me succeeds with valid target career and details', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', [studentCookie])
      .send({
        college: 'Chaitanya Institute',
        semester: 5,
        targetCareerSlug: 'machine-learning-engineer',
        onboardingCompleted: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.targetCareer).toBeDefined();
    expect(res.body.data.user.targetCareer.slug).toBe('machine-learning-engineer');
    expect(res.body.data.user.semester).toBe(5);
    expect(res.body.data.user.onboardingCompleted).toBe(true);
  });

  it('GET /api/meta is public and returns counts, levels, categories, statuses', async () => {
    const res = await request(app).get('/api/meta');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.levels).toBeInstanceOf(Array);
    expect(res.body.data.categories).toBeInstanceOf(Array);
    expect(res.body.data.relationshipTypes).toContain('PREREQUISITE');
    expect(res.body.data.gapStatuses).toContain('developing');
    expect(res.body.data.nodeStates).toContain('recommended');
    expect(res.body.data.counts.skills).toBe(4);
    expect(res.body.data.counts.careers).toBe(2);
  });

  it('skills list pagination, category filter, and q search', async () => {
    // 1. Pagination
    const resPage = await request(app)
      .get('/api/skills?page=1&limit=2')
      .set('Cookie', [studentCookie]);

    expect(resPage.status).toBe(200);
    expect(resPage.body.success).toBe(true);
    expect(resPage.body.data.length).toBe(2);
    expect(resPage.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
    });

    // 2. Category filter
    const resCategory = await request(app)
      .get('/api/skills?category=programming')
      .set('Cookie', [studentCookie]);

    expect(resCategory.status).toBe(200);
    expect(resCategory.body.data.length).toBe(1);
    expect(resCategory.body.data[0].slug).toBe('python');

    // 3. Search q
    const resSearch = await request(app)
      .get('/api/skills?q=stat')
      .set('Cookie', [studentCookie]);

    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBe(1);
    expect(resSearch.body.data[0].slug).toBe('statistics');
  });

  it('skills/:slug includes prerequisites, unlocks, related, and you block', async () => {
    // Assign user proficiency in statistics = 1
    const statSkill = await Skill.findOne({ slug: 'statistics' });
    await UserSkill.create({
      userId: studentId,
      skillId: statSkill._id,
      proficiency: 1,
    });

    const res = await request(app)
      .get('/api/skills/statistics')
      .set('Cookie', [studentCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { skill, prerequisites, unlocks, related, requiredFor, you } = res.body.data;
    expect(skill.slug).toBe('statistics');
    expect(prerequisites.some((p) => p.slug === 'python')).toBe(true);
    expect(unlocks.some((u) => u.slug === 'machine-learning-fundamentals')).toBe(true);
    expect(related.some((r) => r.slug === 'pandas')).toBe(true);
    expect(requiredFor.some((rf) => rf.career.slug === 'machine-learning-engineer')).toBe(true);

    // "you" block: user has proficiency 1, required in MLE is 4 -> gap 3 -> critical
    expect(you.proficiency).toBe(1);
    expect(you.levelLabel).toBe('Beginner');
    expect(you.status).toBe('critical');
    expect(you.targetRequiredLevel).toBe(4);
  });

  it('careers list and detail endpoints return expected shapes', async () => {
    // List
    const resList = await request(app)
      .get('/api/careers')
      .set('Cookie', [studentCookie]);

    expect(resList.status).toBe(200);
    expect(resList.body.success).toBe(true);
    expect(resList.body.data.length).toBe(2);
    const mle = resList.body.data.find((c) => c.slug === 'machine-learning-engineer');
    expect(mle.skillCount).toBe(2);

    // Detail
    const resDetail = await request(app)
      .get('/api/careers/machine-learning-engineer')
      .set('Cookie', [studentCookie]);

    expect(resDetail.status).toBe(200);
    expect(resDetail.body.success).toBe(true);
    expect(resDetail.body.data.career.slug).toBe('machine-learning-engineer');
    expect(resDetail.body.data.skills.length).toBe(2);
    expect(resDetail.body.data.skills[0].importanceLabel).toBeDefined();
  });

  it('logout clears cookie and returns loggedOut: true', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.loggedOut).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('sg_token=;'))).toBe(true);
  });
});
