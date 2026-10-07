import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { app } from '../src/app.js';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { respond } from '../src/utils/respond.js';

describe('API Foundation & Error Handling', () => {
  it('GET /api/health returns 200 with standard success envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    });
  });

  it('GET /api/unknown-route returns 404 with NOT_FOUND error envelope', async () => {
    const res = await request(app).get('/api/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Cannot GET /api/non-existent-route');
  });

  it('Zod validation failure produces 400 VALIDATION_ERROR with structured details', async () => {
    const testSchema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.post('/api/test-validation', validate(testSchema), (req, res) => {
      respond.ok(res, req.validated.body);
    });
    testApp.use(errorHandler);

    const res = await request(testApp)
      .post('/api/test-validation')
      .send({ name: 'A', email: 'invalid-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
    expect(res.body.error.details.some((d) => d.field === 'name')).toBe(true);
    expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
  });
});
