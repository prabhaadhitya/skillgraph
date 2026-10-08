import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
import * as careerModelService from '../src/services/careerModel.service.js';

let mongoServer = null;

let adminCookie = '';
let studentCookie = '';

let skillA = null;
let skillB = null;
let skillC = null;
let careerWeb = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());

  // Clean DB
  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    Career.deleteMany({}),
    CareerSkill.deleteMany({}),
    SkillRelationship.deleteMany({}),
    UserSkill.deleteMany({}),
  ]);


  // Since passwordHash is dummy, use register or set password properly:
  // Let's create passwords via registration
  const regAdmin = await request(app).post('/api/auth/register').send({
    name: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'Password123',
  });
  // Update role to admin in DB
  await User.updateOne({ email: 'superadmin@example.com' }, { role: 'admin' });
  adminCookie = regAdmin.headers['set-cookie'].find((c) => c.startsWith('sg_token='));

  const regStudent = await request(app).post('/api/auth/register').send({
    name: 'Regular Student',
    email: 'student2@example.com',
    password: 'Password123',
  });
  studentCookie = regStudent.headers['set-cookie'].find((c) => c.startsWith('sg_token='));

  // Seed sample skills
  skillA = await Skill.create({
    slug: 'foundations-a',
    name: 'Foundations A',
    description: 'Basic foundations',
    category: 'programming',
    difficulty: 1,
  });

  skillB = await Skill.create({
    slug: 'intermediate-b',
    name: 'Intermediate B',
    description: 'Intermediate topics',
    category: 'programming',
    difficulty: 2,
  });

  skillC = await Skill.create({
    slug: 'advanced-c',
    name: 'Advanced C',
    description: 'Advanced concepts',
    category: 'programming',
    difficulty: 3,
  });

  await Skill.create({
    slug: 'orphan-skill',
    name: 'Orphan Skill',
    description: 'Unused standalone skill',
    category: 'tools',
    difficulty: 1,
  });

  // A -> B prerequisite
  await SkillRelationship.create({
    sourceSkillId: skillA._id,
    targetSkillId: skillB._id,
    relationshipType: 'PREREQUISITE',
    strength: 1,
  });

  // B -> C prerequisite
  await SkillRelationship.create({
    sourceSkillId: skillB._id,
    targetSkillId: skillC._id,
    relationshipType: 'PREREQUISITE',
    strength: 1,
  });

  // Create Career
  careerWeb = await Career.create({
    slug: 'web-dev-pro',
    name: 'Web Dev Pro',
    description: 'Professional Web Developer',
    category: 'software',
    icon: 'code',
    isActive: true,
  });

  // Add career skill: Foundation A
  await CareerSkill.create({
    careerId: careerWeb._id,
    skillId: skillA._id,
    importance: 0.8,
    requiredLevel: 3,
  });
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

describe('Admin Knowledge-Base CRUD API (m2/admin-crud)', () => {
  describe('A6: Student receives 403 FORBIDDEN on admin endpoints', () => {
    it('POST /admin/skills is forbidden for student', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Cookie', studentCookie)
        .send({
          slug: 'new-skill',
          name: 'New Skill',
          category: 'programming',
          difficulty: 2,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /admin/relationships is forbidden for student', async () => {
      const res = await request(app)
        .get('/api/admin/relationships')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PUT /admin/careers/:slug/skills is forbidden for student', async () => {
      const res = await request(app)
        .put('/api/admin/careers/web-dev-pro/skills')
        .set('Cookie', studentCookie)
        .send({ skills: [] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Skills CRUD & Invalidation', () => {
    it('POST /admin/skills creates new skill and invalidates career models', async () => {
      const spyInvalidate = vi.spyOn(careerModelService, 'invalidateCareerModels');

      const res = await request(app)
        .post('/api/admin/skills')
        .set('Cookie', adminCookie)
        .send({
          slug: 'fastapi',
          name: 'FastAPI',
          description: 'Modern Python web framework',
          category: 'backend',
          difficulty: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skill.slug).toBe('fastapi');
      expect(spyInvalidate).toHaveBeenCalled();
      spyInvalidate.mockRestore();
    });

    it('POST /admin/skills rejects duplicate slug with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Cookie', adminCookie)
        .send({
          slug: 'fastapi',
          name: 'FastAPI Duplicate',
          category: 'backend',
          difficulty: 3,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('PATCH /admin/skills/:slug rejects changing slug with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/admin/skills/fastapi')
        .set('Cookie', adminCookie)
        .send({
          slug: 'fastapi-renamed',
          name: 'FastAPI Updated',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /admin/skills/:slug updates mutable fields', async () => {
      const res = await request(app)
        .patch('/api/admin/skills/fastapi')
        .set('Cookie', adminCookie)
        .send({
          name: 'FastAPI Framework',
          difficulty: 4,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skill.name).toBe('FastAPI Framework');
      expect(res.body.data.skill.difficulty).toBe(4);
    });

    it('DELETE /admin/skills/:slug returns 409 CONFLICT if skill is used by relationship or career', async () => {
      // skillA is used in relationship (A -> B) and in careerWeb
      const res = await request(app)
        .delete('/api/admin/skills/foundations-a')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('Cannot delete skill');
      expect(res.body.error.message).toContain('referenced by');
    });

    it('DELETE /admin/skills/:slug deletes unreferenced skill successfully', async () => {
      const res = await request(app)
        .delete('/api/admin/skills/orphan-skill')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);

      const check = await Skill.findOne({ slug: 'orphan-skill' });
      expect(check).toBeNull();
    });
  });

  describe('A11: Relationships, cycles, and RELATED_TO normalization', () => {
    it('rejects source = target with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/admin/relationships')
        .set('Cookie', adminCookie)
        .send({
          source: 'fastapi',
          target: 'fastapi',
          type: 'PREREQUISITE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Source and target cannot be the same skill');
    });

    it('stores RELATED_TO once normalized with sourceId < targetId and rejects duplicate in reverse', async () => {
      const res1 = await request(app)
        .post('/api/admin/relationships')
        .set('Cookie', adminCookie)
        .send({
          source: 'fastapi',
          target: 'foundations-a',
          type: 'RELATED_TO',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);

      // Sending reverse direction must yield 409 CONFLICT
      const res2 = await request(app)
        .post('/api/admin/relationships')
        .set('Cookie', adminCookie)
        .send({
          source: 'foundations-a',
          target: 'fastapi',
          type: 'RELATED_TO',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error.code).toBe('CONFLICT');
    });

    it('A11: A PREREQUISITE creating a cycle returns 422 with exact loop path using real skill names', async () => {
      // Existing chain: Foundations A -> Intermediate B -> Advanced C
      // Attempting to add edge Advanced C -> Foundations A forms a cycle!
      const res = await request(app)
        .post('/api/admin/relationships')
        .set('Cookie', adminCookie)
        .send({
          source: 'advanced-c',
          target: 'foundations-a',
          type: 'PREREQUISITE',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RULE_VIOLATION');
      expect(res.body.error.message).toContain('That would create a loop:');
      expect(res.body.error.message).toContain('Foundations A');
      expect(res.body.error.message).toContain('Intermediate B');
      expect(res.body.error.message).toContain('Advanced C');
    });

    it('GET /admin/relationships?skill=foundations-a lists touching relationships', async () => {
      const res = await request(app)
        .get('/api/admin/relationships?skill=foundations-a')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('A12: Careers management and closure validation (V5, V6)', () => {
    it('POST /admin/careers creates a new career', async () => {
      const res = await request(app)
        .post('/api/admin/careers')
        .set('Cookie', adminCookie)
        .send({
          slug: 'ai-specialist',
          name: 'AI Specialist',
          description: 'Specialist in AI algorithms',
          category: 'ai',
          icon: 'brain',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.career.slug).toBe('ai-specialist');
    });

    it('A12: PUT /admin/careers/:slug/skills returns 422 with missing prerequisite details (closure V5)', async () => {
      // Intermediate B requires Foundations A.
      // If we attempt to set Web Dev Pro's skills to only [Intermediate B] without Foundations A,
      // it must fail closure V5!
      const res = await request(app)
        .put('/api/admin/careers/web-dev-pro/skills')
        .set('Cookie', adminCookie)
        .send({
          skills: [
            {
              skillSlug: 'intermediate-b',
              importance: 0.9,
              requiredLevel: 3,
            },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RULE_VIOLATION');
      expect(res.body.error.details).toBeDefined();
      expect(Array.isArray(res.body.error.details)).toBe(true);

      const detail = res.body.error.details.find(
        (d) => d.missingSkillSlug === 'foundations-a' && d.requiredBySkillSlug === 'intermediate-b',
      );
      expect(detail).toBeDefined();
    });

    it('PUT /admin/careers/:slug/skills returns 422 if prerequisite skill has requiredLevel < 2 (V6)', async () => {
      // Foundations A is a prerequisite for Intermediate B.
      // V6 requires that Foundations A has requiredLevel >= 2 in the career!
      const res = await request(app)
        .put('/api/admin/careers/web-dev-pro/skills')
        .set('Cookie', adminCookie)
        .send({
          skills: [
            {
              skillSlug: 'intermediate-b',
              importance: 0.9,
              requiredLevel: 3,
            },
            {
              skillSlug: 'foundations-a',
              importance: 0.8,
              requiredLevel: 1, // Violates V6: must be >= 2!
            },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RULE_VIOLATION');
      expect(res.body.error.details).toBeDefined();

      const levelErr = res.body.error.details.find(
        (d) => d.skillSlug === 'foundations-a' && d.requiredLevel === 1,
      );
      expect(levelErr).toBeDefined();
    });

    it('PUT /admin/careers/:slug/skills succeeds when closure and level rules are satisfied', async () => {
      const res = await request(app)
        .put('/api/admin/careers/web-dev-pro/skills')
        .set('Cookie', adminCookie)
        .send({
          skills: [
            {
              skillSlug: 'intermediate-b',
              importance: 0.9,
              requiredLevel: 3,
            },
            {
              skillSlug: 'foundations-a',
              importance: 0.8,
              requiredLevel: 3, // Valid >= 2
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills.length).toBe(2);
    });
  });
});
