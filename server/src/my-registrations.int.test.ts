import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

// F-05 (8.1): TEST-17, TEST-18, TEST-45, TEST-46 from f-05-f-06-registrations.md section 11.
const app = createApp();
const DAY = 24 * 60 * 60 * 1000;
const RANDOM = '00000000-0000-4000-8000-000000000000';

type User = Awaited<ReturnType<typeof createUser>>;
let O: User, P1: User, P2: User, P3: User;
let E: { id: string; title: string; location: string; startsAt: Date };
let E2: { id: string };
let R1: string, R2: string, R3: string;

async function cookieFor(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return `sid=${sidFrom(res)}`;
}

const get = (path: string, cookie?: string) => {
  const req = request(app).get(path);
  return cookie ? req.set('Cookie', cookie) : req;
};

function expectError(res: request.Response, status: number, code: string, message?: string) {
  expect(res.status).toBe(status);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  expect(Object.keys(error).sort()).toEqual(['code', 'message']);
  if (message) expect(error.message).toBe(message);
}

beforeEach(async () => {
  O = await createUser('ORGANIZER', 'o@example.com');
  const O2 = await createUser('ORGANIZER', 'o2@example.com');
  P1 = await createUser('PARTICIPANT', 'p1@example.com');
  P2 = await createUser('PARTICIPANT', 'p2@example.com');
  P3 = await createUser('PARTICIPANT', 'p3@example.com');
  const future = new Date(Date.now() + 7 * DAY);
  const event = (ownerId: string, title: string, status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') =>
    prisma.event.create({
      data: { ownerId, title, description: '', location: `${title} room`, startsAt: future, capacity: 5, status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null },
    });
  E = await event(O.id, 'E');
  E2 = await event(O2.id, 'E2');
  await event(O.id, 'D', 'DRAFT');
  const reg = async (participantId: string, eventId: string, minutesAgo: number) =>
    (await prisma.registration.create({
      data: { participantId, eventId, createdAt: new Date(Date.now() - minutesAgo * 60000) },
    })).id;
  R1 = await reg(P1.id, E.id, 40);
  R2 = await reg(P2.id, E.id, 30);
  R3 = await reg(P1.id, E2.id, 20);
  await reg(P3.id, E2.id, 10);
});

describe('F-05 my registrations API', () => {
  it('TEST-17 AC-17 returns only the participant\'s own registrations, newest first, and one by ID', async () => {
    await createUser('PARTICIPANT', 'p4@example.com');
    const p1 = await cookieFor('p1@example.com');

    const list = await get('/api/registrations/mine', p1);
    expect(list.status).toBe(200);
    expect(list.body.registrations.map((r: { id: string }) => r.id)).toEqual([R3, R1]);
    for (const r of list.body.registrations) expect(r.status).toBe('ACTIVE');
    expect(list.body.registrations[1].event).toEqual({
      id: E.id, title: E.title, location: E.location, startsAt: E.startsAt.toISOString(),
    });

    const one = await get(`/api/registrations/${R1}`, p1);
    expect(one.status).toBe(200);
    expect(one.body.registration.id).toBe(R1);
    expect(one.body.registration.event.id).toBe(E.id);

    const empty = await get('/api/registrations/mine', await cookieFor('p4@example.com'));
    expect(empty.status).toBe(200);
    expect(empty.body.registrations).toEqual([]);
  });

  it('TEST-18 AC-18 returns 404 for another participant\'s registration', async () => {
    const res = await get(`/api/registrations/${R2}`, await cookieFor('p1@example.com'));
    expectError(res, 404, 'NOT_FOUND', 'Registration not found.');
  });

  it('TEST-45 AC-45 returns 401 without a valid session on both routes', async () => {
    const past = new Date(Date.now() - 1000);
    const expired = { mine: await insertSession(P1.id, past), one: await insertSession(P1.id, past) };
    const old = await cookieFor('p1@example.com');
    expect((await request(app).post('/api/auth/logout').set('Cookie', old).send({})).status).toBe(204);

    for (const [path, token] of [['/api/registrations/mine', expired.mine], [`/api/registrations/${R1}`, expired.one]]) {
      for (const cookie of [undefined, 'sid=unknown-token', `sid=${token}`, old]) {
        expectError(await get(path, cookie), 401, 'UNAUTHENTICATED');
      }
    }
  });

  it('TEST-46 AC-46 returns 403 to organizers, 404 for an unknown ID and 400 for a non-UUID', async () => {
    const o = await cookieFor('o@example.com');
    for (const path of ['/api/registrations/mine', `/api/registrations/${R1}`, `/api/registrations/${RANDOM}`]) {
      expectError(await get(path, o), 403, 'FORBIDDEN', 'You do not have access to this.');
    }

    const p1 = await cookieFor('p1@example.com');
    expectError(await get(`/api/registrations/${RANDOM}`, p1), 404, 'NOT_FOUND', 'Registration not found.');

    const bad = await get('/api/registrations/not-a-uuid', p1);
    expect(bad.status).toBe(400);
    const error = errorBody(bad);
    expect(Object.keys(error).sort()).toEqual(['code', 'details', 'message']);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details!.length).toBeGreaterThan(0);
    for (const d of error.details!) {
      expect(Object.keys(d).sort()).toEqual(['field', 'message']);
      expect(d.message).not.toBe('');
    }
    expect(error.details!.some((d) => d.field === 'id')).toBe(true);
  });
});
