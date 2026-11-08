import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../lib/errors';
import { requireRole, requireSession } from './middleware';
import { createUser, errorBody, insertSession } from '../../test/fixtures';

// Test-only harness route (never in production): an organizer-only route with a handler spy.
function harness() {
  const handler = vi.fn((req: express.Request, res: express.Response) => {
    res.json({ caller: res.locals.user, target: req.params.id });
  });
  const app = express();
  app.use(express.json());
  app.post('/harness/:id', requireSession, requireRole('ORGANIZER'), handler);
  app.use(errorHandler);
  return { app, handler };
}

const IDS = ['3f1c2a9e-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000000', 'not-a-uuid'];
const hour = () => new Date(Date.now() + 60 * 60 * 1000);

describe('F-01 shared guards', () => {
  it('TEST-42 AC-42 rejects anonymous callers with 401 before the role check and never reaches the handler', async () => {
    const { app, handler } = harness();
    for (const id of IDS) {
      const res = await request(app).post(`/harness/${id}`).send({ role: 'ORGANIZER' });
      expect(res.status).toBe(401);
      expect(errorBody(res).code).toBe('UNAUTHENTICATED');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('TEST-42 AC-42 gives a wrong-role session 403 for every target ID, even when the body claims another role', async () => {
    const { app, handler } = harness();
    const p = await createUser('PARTICIPANT', 'p1@example.com');
    const sid = await insertSession(p.id, hour());
    for (const id of IDS) {
      const res = await request(app).post(`/harness/${id}`).set('Cookie', `sid=${sid}`).send({ role: 'ORGANIZER', userId: p.id });
      expect(res.status).toBe(403);
      expect(errorBody(res).code).toBe('FORBIDDEN');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('TEST-42 AC-42 lets the correct role through with the session identity, ignoring client-supplied identity', async () => {
    const { app, handler } = harness();
    const o = await createUser('ORGANIZER', 'o1@example.com', 'Organizer One');
    const p = await createUser('PARTICIPANT', 'p1@example.com');
    const sid = await insertSession(o.id, hour());
    const res = await request(app).post(`/harness/${IDS[0]}`).set('Cookie', `sid=${sid}`).send({ userId: p.id, role: 'PARTICIPANT' });
    expect(res.status).toBe(200);
    expect(res.body.caller).toEqual({ id: o.id, name: 'Organizer One', role: 'ORGANIZER' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
