import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

// F-04 Definition of Done tests not in sub-task 7.1: TEST-37 (NFR-04), TEST-43 (NFR-01), TEST-44 (NFR-03, NFR-07).
const app = createApp();
const DAY = 24 * 60 * 60 * 1000;

async function login(email: string) {
  const user = await createUser('PARTICIPANT', email);
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { user, cookie: `sid=${sidFrom(res)}` };
}

async function publishedEvent(capacity = 5) {
  const o = await createUser('ORGANIZER', 'o@example.com');
  return prisma.event.create({
    data: {
      ownerId: o.id, title: 'Event', description: '', location: 'Hall A', capacity,
      startsAt: new Date(Date.now() + 7 * DAY), status: 'PUBLISHED', publishedAt: new Date(),
    },
  });
}

const register = (eventId: string, cookie?: string, body: object = {}) => {
  const req = request(app).post(`/api/events/${eventId}/registrations`);
  return (cookie ? req.set('Cookie', cookie) : req).send(body);
};

describe('F-04 register limits', () => {
  it('TEST-37 AC-37 stores exactly 5 ACTIVE registrations when 20 participants register at once for capacity 5', async () => {
    const e = await publishedEvent(5);
    const ps = [];
    for (let i = 1; i <= 20; i++) ps.push(await login(`p${i}@example.com`));

    const results = await Promise.all(ps.map((p) => register(e.id, p.cookie)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    const rejected = results.filter((r) => r.status !== 201);
    expect(rejected).toHaveLength(15);
    for (const r of rejected) {
      expect(r.status).toBe(409);
      expect(errorBody(r).code).toBe('EVENT_FULL');
    }
    const rows = await prisma.registration.findMany({ where: { eventId: e.id, status: 'ACTIVE' } });
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.participantId)).size).toBe(5);
  }, 60000);

  it('TEST-43 AC-43 rejects no, unknown, expired and logged-out sessions with 401 and stores nothing', async () => {
    const e = await publishedEvent();
    const p1 = await createUser('PARTICIPANT', 'p1@example.com');
    const expired = await insertSession(p1.id, new Date(Date.now() - 1000));
    const loginRes = await request(app).post('/api/auth/login').send({ email: p1.email, password: PASSWORD });
    const old = `sid=${sidFrom(loginRes)}`;
    await request(app).post('/api/auth/logout').set('Cookie', old).send({});

    for (const cookie of [undefined, 'sid=random-unknown-token', `sid=${expired}`, old]) {
      const res = await register(e.id, cookie);
      expect(res.status).toBe(401);
      const err = errorBody(res);
      expect(err.code).toBe('UNAUTHENTICATED');
      expect(Object.keys(err).sort()).toEqual(['code', 'message']);
    }
    expect(await prisma.registration.count()).toBe(0);
  });

  it('TEST-44 AC-44 rejects a participantId body and a non-UUID id with the full 400 envelope and stores nothing', async () => {
    const e = await publishedEvent();
    const p1 = await login('p1@example.com');
    const p2 = await createUser('PARTICIPANT', 'p2@example.com');

    const cases: [request.Response, string][] = [
      [await register(e.id, p1.cookie, { participantId: p2.id }), 'participantId'],
      [await register('not-a-uuid', p1.cookie), 'id'],
    ];
    for (const [res, field] of cases) {
      expect(res.status).toBe(400);
      expect(Object.keys(res.body)).toEqual(['error']);
      const err = errorBody(res);
      expect(Object.keys(err).sort()).toEqual(['code', 'details', 'message']);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(err.details) && err.details.length > 0).toBe(true);
      for (const d of err.details!) {
        expect(Object.keys(d).sort()).toEqual(['field', 'message']);
        expect(typeof d.field === 'string' && d.field !== '').toBe(true);
        expect(typeof d.message === 'string' && d.message !== '').toBe(true);
      }
      expect(err.details!.some((d) => d.field === field)).toBe(true);
    }
    expect(await prisma.registration.count()).toBe(0);
  });
});
