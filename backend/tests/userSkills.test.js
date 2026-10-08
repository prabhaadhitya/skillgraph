import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Skill } from '../src/models/skill.model.js';
import { Career } from '../src/models/career.model.js';
import { CareerSkill } from '../src/models/careerSkill.model.js';
import { UserSkill } from '../src/models/userSkill.model.js';
import { UserProgress } from '../src/models/userProgress.model.js';
import { AlignmentSnapshot } from '../src/models/alignmentSnapshot.model.js';
import {
  setAlignmentService,
} from '../src/services/userSkills.service.js';
import * as defaultAlignmentService from '../src/services/alignment.service.js';

let mongoServer = null;

let userACookie = '';
let userAId = '';
let userBCookie = '';
let userBId = '';
let userNoCareerCookie = '';

let pythonSkill = null;
let sqlSkill = null;
let statsSkill = null;
let mleCareer = null;
let dsCareer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  // Clean collections
  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    UserSkill.deleteMany({}),
    UserProgress.deleteMany({}),
    AlignmentSnapshot.deleteMany({}),
  ]);

  // Seed sample skills
  pythonSkill = await Skill.create({
    slug: 'python',
    name: 'Python',
    description: 'Python programming language',
    category: 'programming',
    difficulty: 2,
  });

  sqlSkill = await Skill.create({
    slug: 'sql',
    name: 'SQL',
    description: 'Structured Query Language',
    category: 'database',
    difficulty: 2,
  });

  statsSkill = await Skill.create({
    slug: 'statistics',
    name: 'Statistics',
    description: 'Probability and statistics',
    category: 'data-analytics',
    difficulty: 3,
  });

  await Skill.create({
    slug: 'docker',
    name: 'Docker',
    description: 'Container engine',
    category: 'devops',
    difficulty: 2,
  });

  // Seed careers
  mleCareer = await Career.create({
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    description: 'Build ML systems',
    category: 'ai',
    icon: 'brain',
    isActive: true,
  });

  dsCareer = await Career.create({
    slug: 'data-scientist',
    name: 'Data Scientist',
    description: 'Analyze data',
    category: 'data',
    icon: 'bar-chart',
    isActive: true,
  });

  // Career skills for MLE
  await CareerSkill.create([
    {
      careerId: mleCareer._id,
      skillId: pythonSkill._id,
      importance: 0.9,
      requiredLevel: 4,
    },
    {
      careerId: mleCareer._id,
      skillId: statsSkill._id,
      importance: 0.8,
      requiredLevel: 4,
    },
    {
      careerId: mleCareer._id,
      skillId: sqlSkill._id,
      importance: 0.7,
      requiredLevel: 3,
    },
    {
      careerId: dsCareer._id,
      skillId: statsSkill._id,
      importance: 0.9,
      requiredLevel: 4,
    },
  ]);

  // Register User A
  const regARes = await request(app).post('/api/auth/register').send({
    name: 'Alice Student',
    email: 'alice@example.com',
    password: 'Password123',
  });
  userACookie = regARes.headers['set-cookie'].find((c) => c.startsWith('sg_token='));
  userAId = regARes.body.data.user.id;

  // Set target career for User A
  await request(app)
    .patch('/api/users/me')
    .set('Cookie', userACookie)
    .send({ targetCareerSlug: 'machine-learning-engineer' });

  // Register User B
  const regBRes = await request(app).post('/api/auth/register').send({
    name: 'Bob Student',
    email: 'bob@example.com',
    password: 'Password123',
  });
  userBCookie = regBRes.headers['set-cookie'].find((c) => c.startsWith('sg_token='));
  userBId = regBRes.body.data.user.id;

  // Set target career for User B
  await request(app)
    .patch('/api/users/me')
    .set('Cookie', userBCookie)
    .send({ targetCareerSlug: 'machine-learning-engineer' });

  // Register User with no target career
  const regNoCareerRes = await request(app).post('/api/auth/register').send({
    name: 'Charlie Newbie',
    email: 'charlie@example.com',
    password: 'Password123',
  });
  userNoCareerCookie = regNoCareerRes.headers['set-cookie'].find((c) =>
    c.startsWith('sg_token='),
  );
});

afterAll(async () => {
  try {
    await Promise.all([
      User.deleteMany({}),
      Skill.deleteMany({}),
      Career.deleteMany({}),
      CareerSkill.deleteMany({}),
      UserSkill.deleteMany({}),
      UserProgress.deleteMany({}),
      AlignmentSnapshot.deleteMany({}),
    ]);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch {
    // Ignore cleanup errors
  }
});

beforeEach(() => {
  // Reset alignment service to default
  setAlignmentService(defaultAlignmentService);
});

describe('User Skills & Progress API (m2/user-skills-progress)', () => {
  describe('A10: 422 without a target career', () => {
    it('PATCH /users/me/skills/:skillSlug returns 422 RULE_VIOLATION when user has no target career', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userNoCareerCookie)
        .send({ proficiency: 3 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RULE_VIOLATION');
      expect(res.body.error.message).toBe('Choose a target career first');
    });

    it('PUT /users/me/skills returns 422 RULE_VIOLATION when user has no target career', async () => {
      const res = await request(app)
        .put('/api/users/me/skills')
        .set('Cookie', userNoCareerCookie)
        .send({
          skills: [{ skillSlug: 'python', proficiency: 3 }],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RULE_VIOLATION');
      expect(res.body.error.message).toBe('Choose a target career first');
    });
  });

  describe('A8: Validation rules (6, -1, "3", 2.5 rejected with 400 VALIDATION_ERROR)', () => {
    it('rejects proficiency 6 with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userACookie)
        .send({ proficiency: 6 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'proficiency')).toBe(true);
    });

    it('rejects proficiency -1 with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userACookie)
        .send({ proficiency: -1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'proficiency')).toBe(true);
    });

    it('rejects proficiency "3" (string) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userACookie)
        .send({ proficiency: '3' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'proficiency')).toBe(true);
    });

    it('rejects proficiency 2.5 (non-integer) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userACookie)
        .send({ proficiency: 2.5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'proficiency')).toBe(true);
    });

    it('rejects extra properties in body with 400 VALIDATION_ERROR (strict schema)', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userACookie)
        .send({ proficiency: 3, hack: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unknown skillSlug in PATCH with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/unknown-skill-xyz')
        .set('Cookie', userACookie)
        .send({ proficiency: 3 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('unknown-skill-xyz');
    });

    it('rejects unknown skillSlug in PUT with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .put('/api/users/me/skills')
        .set('Cookie', userACookie)
        .send({
          skills: [{ skillSlug: 'nonexistent-skill', proficiency: 3 }],
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('nonexistent-skill');
    });
  });

  describe('A17: Envelope shape and happy path PATCH/GET', () => {
    it('PATCH /users/me/skills/:skillSlug returns correct envelope and fit calculation', async () => {
      const res = await request(app)
        .patch('/api/users/me/skills/python')
        .set('Cookie', userACookie)
        .send({ proficiency: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { skill, previousLevel, proficiency, fit } = res.body.data;
      expect(skill.slug).toBe('python');
      expect(skill.name).toBe('Python');
      expect(previousLevel).toBe(0);
      expect(proficiency).toBe(3);
      expect(fit).toBeDefined();
      expect(typeof fit.score).toBe('number');
      expect(['early', 'developing', 'strong']).toContain(fit.band);
    });

    it('GET /users/me/skills returns list of items with skillRef, levelLabel, source', async () => {
      const res = await request(app)
        .get('/api/users/me/skills')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      const pythonItem = res.body.data.items.find((i) => i.skill.slug === 'python');
      expect(pythonItem).toBeDefined();
      expect(pythonItem.proficiency).toBe(3);
      expect(pythonItem.levelLabel).toBe('Intermediate');
      expect(pythonItem.source).toBe('self');
    });
  });

  describe('A9: PUT replaces whole profile, proficiency 0 removes rows', () => {
    it('PUT replaces profile and setting proficiency to 0 removes skill row', async () => {
      // User A starts with Python 3 from previous test.
      // Replace with SQL: 2, Statistics: 1, and Python: 0 (or omit Python)
      const res = await request(app)
        .put('/api/users/me/skills')
        .set('Cookie', userACookie)
        .send({
          skills: [
            { skillSlug: 'sql', proficiency: 2 },
            { skillSlug: 'statistics', proficiency: 1 },
            { skillSlug: 'python', proficiency: 0 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.fit).toBeDefined();

      // Verify returned items
      const returnedSlugs = res.body.data.items.map((i) => i.skill.slug);
      expect(returnedSlugs).toContain('sql');
      expect(returnedSlugs).toContain('statistics');
      expect(returnedSlugs).not.toContain('python');

      // Verify GET /users/me/skills matches
      const getRes = await request(app)
        .get('/api/users/me/skills')
        .set('Cookie', userACookie);

      const currentItems = getRes.body.data.items;
      const currentSlugs = currentItems.map((i) => i.skill.slug);
      expect(currentSlugs).not.toContain('python');
      expect(currentSlugs).toContain('sql');
      expect(currentSlugs).toContain('statistics');

      // Check DB directly: no UserSkill row exists with proficiency 0
      const dbPython = await UserSkill.findOne({ userId: userAId, skillId: pythonSkill._id });
      expect(dbPython).toBeNull();
    });
  });

  describe('Progress rows written once per real change', () => {
    it('writes UserProgress row on change, writes nothing when proficiency is unchanged', async () => {
      // Clean progress for user A for isolated testing
      await UserProgress.deleteMany({ userId: userAId });

      // 1. Initial change: SQL from 2 to 3
      const patch1 = await request(app)
        .patch('/api/users/me/skills/sql')
        .set('Cookie', userACookie)
        .send({ proficiency: 3 });
      expect(patch1.status).toBe(200);

      const progress1 = await UserProgress.find({ userId: userAId, skillId: sqlSkill._id });
      expect(progress1.length).toBe(1);
      expect(progress1[0].previousLevel).toBe(2);
      expect(progress1[0].currentLevel).toBe(3);

      // 2. Same change again: SQL 3 to 3 (NO-OP for progress)
      const patch2 = await request(app)
        .patch('/api/users/me/skills/sql')
        .set('Cookie', userACookie)
        .send({ proficiency: 3 });
      expect(patch2.status).toBe(200);

      const progress2 = await UserProgress.find({ userId: userAId, skillId: sqlSkill._id });
      expect(progress2.length).toBe(1); // Still 1!

      // 3. Remove skill: SQL 3 to 0
      const patch3 = await request(app)
        .patch('/api/users/me/skills/sql')
        .set('Cookie', userACookie)
        .send({ proficiency: 0 });
      expect(patch3.status).toBe(200);

      const progress3 = await UserProgress.find({ userId: userAId, skillId: sqlSkill._id }).sort({
        createdAt: -1,
      });
      expect(progress3.length).toBe(2);
      expect(progress3[0].previousLevel).toBe(3);
      expect(progress3[0].currentLevel).toBe(0);

      // 4. Same 0 to 0 again
      const patch4 = await request(app)
        .patch('/api/users/me/skills/sql')
        .set('Cookie', userACookie)
        .send({ proficiency: 0 });
      expect(patch4.status).toBe(200);

      const progress4 = await UserProgress.find({ userId: userAId, skillId: sqlSkill._id });
      expect(progress4.length).toBe(2); // Still 2!
    });

    it('GET /users/me/progress returns history sorted newest first with skill name and alignment', async () => {
      const res = await request(app)
        .get('/api/users/me/progress')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.history)).toBe(true);
      expect(Array.isArray(res.body.data.alignment)).toBe(true);

      const history = res.body.data.history;
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].skill).toBeDefined();
      expect(history[0].skill.name).toBeDefined();
      expect(history[0].previousLevel).toBeDefined();
      expect(history[0].currentLevel).toBeDefined();
      expect(history[0].at).toBeDefined();

      // Check newest first
      if (history.length > 1) {
        const t0 = new Date(history[0].at).getTime();
        const t1 = new Date(history[1].at).getTime();
        expect(t0).toBeGreaterThanOrEqual(t1);
      }
    });
  });

  describe('A7: User A cannot affect User B (IDOR protection)', () => {
    it('updates by User A do not change User B skills or progress', async () => {
      // Set User B skills: Python 2, Docker 1
      await request(app)
        .put('/api/users/me/skills')
        .set('Cookie', userBCookie)
        .send({
          skills: [
            { skillSlug: 'python', proficiency: 2 },
            { skillSlug: 'docker', proficiency: 1 },
          ],
        });

      const userBProgressBefore = await UserProgress.countDocuments({ userId: userBId });

      // User A updates Python to 5 and Docker to 4
      await request(app)
        .put('/api/users/me/skills')
        .set('Cookie', userACookie)
        .send({
          skills: [
            { skillSlug: 'python', proficiency: 5 },
            { skillSlug: 'docker', proficiency: 4 },
          ],
        });

      // Check User B skills
      const resB = await request(app)
        .get('/api/users/me/skills')
        .set('Cookie', userBCookie);

      const bSkills = resB.body.data.items;
      const bPython = bSkills.find((s) => s.skill.slug === 'python');
      const bDocker = bSkills.find((s) => s.skill.slug === 'docker');

      expect(bPython.proficiency).toBe(2);
      expect(bDocker.proficiency).toBe(1);

      // Check User B progress unchanged
      const userBProgressAfter = await UserProgress.countDocuments({ userId: userBId });
      expect(userBProgressAfter).toBe(userBProgressBefore);
    });
  });

  describe('Alignment snapshot triggers and injectable service', () => {
    it('invokes injectable alignmentService.recordSnapshot on skill changes', async () => {
      const fakeRecordSnapshot = vi.fn().mockResolvedValue({
        score: 85,
        previousScore: 70,
        band: 'strong',
      });

      setAlignmentService({
        recordSnapshot: fakeRecordSnapshot,
      });

      const res = await request(app)
        .patch('/api/users/me/skills/docker')
        .set('Cookie', userACookie)
        .send({ proficiency: 3 });

      expect(res.status).toBe(200);
      expect(fakeRecordSnapshot).toHaveBeenCalled();
      expect(res.body.data.fit.score).toBe(85);
      expect(res.body.data.fit.band).toBe('strong');
    });

    it('PATCH /users/me records snapshot with trigger "target_change" when target career changes', async () => {
      const fakeRecordSnapshot = vi.fn().mockResolvedValue({
        score: 60,
        previousScore: 50,
        band: 'developing',
      });

      setAlignmentService({
        recordSnapshot: fakeRecordSnapshot,
      });

      const res = await request(app)
        .patch('/api/users/me')
        .set('Cookie', userACookie)
        .send({ targetCareerSlug: 'data-scientist' });

      expect(res.status).toBe(200);
      expect(fakeRecordSnapshot).toHaveBeenCalledWith(userAId, 'target_change');
    });
  });
});
