import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { ChatMessage } from '../src/models/chatMessage.model.js';

let mongoServer;
let authCookie = '';
let userId = '';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    ChatMessage.deleteMany({}),
  ]);

  const skill = await Skill.create({
    slug: 'python',
    name: 'Python',
    description: 'Python programming',
    category: 'programming',
    difficulty: 2,
  });

  const career = await Career.create({
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    description: 'ML systems',
    category: 'ai',
    icon: 'brain',
    isActive: true,
  });

  await CareerSkill.create({
    careerId: career._id,
    skillId: skill._id,
    importance: 0.9,
    requiredLevel: 4,
  });

  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Student User',
    email: 'student@example.com',
    password: 'Password123!',
  });

  authCookie = regRes.headers['set-cookie'].find((c) => c.startsWith('sg_token='));
  userId = regRes.body.data.user.id;

  await request(app)
    .patch('/api/users/me')
    .set('Cookie', authCookie)
    .send({ targetCareerSlug: 'machine-learning-engineer' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AI & Recommendations Route Contracts', () => {
  it('POST /api/ai/chat rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('POST /api/ai/chat rejects messages exceeding 500 chars with 400 VALIDATION_ERROR', async () => {
    const longMessage = 'A'.repeat(501);
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', authCookie)
      .send({ message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'message')).toBe(true);
  });

  it('POST /api/ai/chat succeeds with template fallback when no user key configured', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', authCookie)
      .send({ message: 'Why should I learn Python?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reply');
    expect(res.body.data).toHaveProperty('intent');
    expect(res.body.data).toHaveProperty('grounding');
    expect(res.body.data.degraded).toBe(true);
    expect(res.body.data.keySource).toBe('none');
  });

  it('POST /api/ai/explain succeeds and returns explanation for a recommended skill', async () => {
    const res = await request(app)
      .post('/api/ai/explain')
      .set('Cookie', authCookie)
      .send({ skillSlug: 'python' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('explain_recommendation');
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.grounding.skills).toContain('python');
  });

  it('GET /api/ai/history returns conversation messages in chronological order', async () => {
    const res = await request(app)
      .get('/api/ai/history?limit=10')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]).toHaveProperty('role');
    expect(res.body.data.items[0]).toHaveProperty('content');
  });

  it('DELETE /api/ai/history clears user history', async () => {
    const delRes = await request(app)
      .delete('/api/ai/history')
      .set('Cookie', authCookie);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.cleared).toBe(true);

    const checkRes = await request(app)
      .get('/api/ai/history')
      .set('Cookie', authCookie);

    expect(checkRes.body.data.items).toEqual([]);
  });

  it('GET /api/recommendations/next-skills returns recommendations envelope with rule fallback when ML is unavailable', async () => {
    const res = await request(app)
      .get('/api/recommendations/next-skills?limit=3&strategy=auto')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.strategy).toBe('rule');
    expect(res.body.data.fallbackReason).toBe('ML_UNAVAILABLE');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].skill.slug).toBe('python');
  });
});
