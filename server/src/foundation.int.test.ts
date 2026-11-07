import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';

// Foundation smoke test (Issue 3.3): proves the runner, the app and the test database work together.
describe('foundation', () => {
  it('serves GET /api/health', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('uses the separate test database with migrations applied and empty tables', async () => {
    const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(db).toBe(new URL(process.env.DATABASE_URL_TEST!).pathname.slice(1));
    expect(await prisma.user.count()).toBe(0);
  });
});
