import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { resetMlHealthCache } from '../src/controllers/health.controller.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ spawn: { timeout: 60000 } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Backend Health Check Endpoints (GET /health & GET /api/health)', () => {
  it('GET /health returns 200 with db and ml status in standard envelope', async () => {
    resetMlHealthCache();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.db).toBe('up');
    expect(['up', 'down', 'unknown']).toContain(res.body.data.ml);
    expect(['ok', 'degraded']).toContain(res.body.data.status);
  });

  it('GET /health returns required fields db, ml and status', async () => {
    resetMlHealthCache();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('db');
    expect(res.body.data).toHaveProperty('ml');
    expect(res.body.data).toHaveProperty('status');
  });

  it('caches ml status for 10 seconds without refetching', async () => {
    resetMlHealthCache();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    // First call triggers fetch
    const res1 = await request(app).get('/health');
    expect(res1.status).toBe(200);
    expect(res1.body.data.ml).toBe('up');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call immediately within 10s uses cache
    const res2 = await request(app).get('/health');
    expect(res2.status).toBe(200);
    expect(res2.body.data.ml).toBe('up');
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Not called again!

    fetchSpy.mockRestore();
    resetMlHealthCache();
  });

  it('reports ml: "down" gracefully when fetch throws or times out without crashing', async () => {
    resetMlHealthCache();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ml).toBe('down');

    fetchSpy.mockRestore();
    resetMlHealthCache();
  });
});
