import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

// F-07 (S2-03, #202): TEST-73 to TEST-79 from docs/sprints/sprint-2/f-07-cancel.md section 10.
const app = createApp();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const RANDOM = '00000000-0000-4000-8000-000000000000';
const future = () => new Date(Date.now() + 7 * DAY);

afterEach(() => {
  vi.useRealTimers();
});

async function login(role: 'PARTICIPANT' | 'ORGANIZER', email: string) {
  const user = await createUser(role, email);
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { user, cookie: `sid=${sidFrom(res)}` };
}

function seedEvent(ownerId: string, startsAt: Date, capacity = 5) {
  return prisma.event.create({
    data: { ownerId, title: 'Seeded event', description: '', location: 'Hall A', startsAt, capacity, status: 'PUBLISHED', publishedAt: new Date(Date.now() - DAY) },
  });
}

const hold = (eventId: string, participantId: string, cancelledAt?: Date) =>
  prisma.registration.create({
    data: { eventId, participantId, ...(cancelledAt ? { status: 'CANCELLED' as const, cancelledAt } : {}) },
  });

const cancel = (id: string, cookie?: string) => {
  const req = request(app).post(`/api/registrations/${id}/cancel`);
  return (cookie ? req.set('Cookie', cookie) : req).send({});
};

// Freezes the server clock (the route's `new Date()`) for one request.
async function cancelAt(now: Date, id: string, cookie: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  try {
    return await cancel(id, cookie);
  } finally {
    vi.useRealTimers();
  }
}

const register = (eventId: string, cookie: string) =>
  request(app).post(`/api/events/${eventId}/registrations`).set('Cookie', cookie).send({});

const row = (id: string) => prisma.registration.findUniqueOrThrow({ where: { id } });

function expectError(res: request.Response, status: number, code: string, message?: string) {
  expect(res.status).toBe(status);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  expect(Object.keys(error).sort()).toEqual(['code', 'message']);
  if (message) expect(error.message).toBe(message);
}

describe('F-07 cancel registration API', () => {
  it('TEST-73 AC-73 cancels the participant\'s own active registration and keeps the row', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const e = await seedEvent(o.id, future(), 2);
    const r = await hold(e.id, p.user.id);
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    const res = await cancelAt(now, r.id, p.cookie);

    expect(res.status).toBe(200);
    expect(res.body.registration).toMatchObject({
      id: r.id, status: 'CANCELLED', cancelledAt: now.toISOString(),
      event: { id: e.id, title: e.title, location: e.location, startsAt: e.startsAt.toISOString() },
    });
    const list = await request(app).get('/api/registrations/mine').set('Cookie', p.cookie);
    expect(list.status).toBe(200);
    expect(list.body.registrations.map((x: { id: string; status: string }) => [x.id, x.status])).toEqual([[r.id, 'CANCELLED']]);
    const stored = await row(r.id);
    expect(stored.status).toBe('CANCELLED');
    expect(stored.cancelledAt).toEqual(now);
    expect(await prisma.registration.count()).toBe(1);
    expect(await prisma.registration.count({ where: { eventId: e.id, status: 'ACTIVE' } })).toBe(0);
  });

  it('TEST-74 AC-74 returns 401 without a valid session, 403 to organizers and 400 for a non-UUID', async () => {
    const o = await login('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const e = await seedEvent(o.user.id, future());
    const r = await hold(e.id, p.user.id);
    const before = await row(r.id);
    const expired = await insertSession(p.user.id, new Date(Date.now() - 1000));
    const old = await login('PARTICIPANT', 'p-old@example.com');
    expect((await request(app).post('/api/auth/logout').set('Cookie', old.cookie).send({})).status).toBe(204);
    const oldRow = await hold(e.id, old.user.id);

    for (const cookie of [undefined, 'sid=unknown-token', `sid=${expired}`]) {
      expectError(await cancel(r.id, cookie), 401, 'UNAUTHENTICATED');
    }
    expectError(await cancel(oldRow.id, old.cookie), 401, 'UNAUTHENTICATED');
    for (const id of [r.id, 'not-a-uuid']) {
      expectError(await cancel(id, o.cookie), 403, 'FORBIDDEN', 'You do not have access to this.');
    }

    const bad = await cancel('not-a-uuid', p.cookie);
    expect(bad.status).toBe(400);
    const error = errorBody(bad);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details!.some((d) => d.field === 'id')).toBe(true);

    expect(await row(r.id)).toEqual(before);
    expect((await row(oldRow.id)).status).toBe('ACTIVE');
  });

  it('TEST-75 AC-75 returns the same 404 for another participant\'s and an unknown registration', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const p2 = await createUser('PARTICIPANT', 'p2@example.com');
    const e = await seedEvent(o.id, future());
    await hold(e.id, p.user.id);
    const r2 = await hold(e.id, p2.id);

    const foreign = await cancel(r2.id, p.cookie);
    const unknown = await cancel(RANDOM, p.cookie);

    expectError(foreign, 404, 'NOT_FOUND', 'Registration not found.');
    expectError(unknown, 404, 'NOT_FOUND', 'Registration not found.');
    expect(foreign.body).toEqual(unknown.body);
    const stored = await row(r2.id);
    expect(stored.status).toBe('ACTIVE');
    expect(stored.cancelledAt).toBeNull();
  });

  it('TEST-76 AC-76 refuses an already cancelled row with ALREADY_CANCELLED and a started event with EVENT_STARTED', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const earlier = new Date(Date.now() - DAY);
    const startsNow = new Date(Math.ceil(Date.now() / 1000) * 1000 + MIN);
    const cancelledFuture = await hold((await seedEvent(o.id, future())).id, p.user.id, earlier);
    const cancelledStarted = await hold((await seedEvent(o.id, new Date(Date.now() - 60 * MIN))).id, p.user.id, earlier);
    const atStart = await hold((await seedEvent(o.id, startsNow)).id, p.user.id);
    const afterStart = await hold((await seedEvent(o.id, new Date(Date.now() - 60 * MIN))).id, p.user.id);
    const before = await prisma.registration.findMany({ orderBy: { id: 'asc' } });

    for (const r of [cancelledFuture, cancelledStarted]) {
      expectError(await cancel(r.id, p.cookie), 409, 'ALREADY_CANCELLED', 'This registration has already been cancelled.');
    }
    expectError(await cancelAt(startsNow, atStart.id, p.cookie), 409, 'EVENT_STARTED', 'This event has already started.');
    expectError(await cancel(afterStart.id, p.cookie), 409, 'EVENT_STARTED', 'This event has already started.');

    expect(await prisma.registration.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });

  it('TEST-77 AC-77 lets the participant register again after cancelling, as a new ACTIVE row', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const e = await seedEvent(o.id, future());
    const r = await hold(e.id, p.user.id);

    expect((await cancel(r.id, p.cookie)).status).toBe(200);
    const again = await register(e.id, p.cookie);

    expect(again.status).toBe(201);
    expect(again.body.registration).toMatchObject({ eventId: e.id, status: 'ACTIVE' });
    expect(again.body.registration.id).not.toBe(r.id);
    const rows = await prisma.registration.findMany({ where: { eventId: e.id, participantId: p.user.id } });
    expect(rows).toHaveLength(2);
    const old = rows.find((x) => x.id === r.id)!;
    expect(old.status).toBe('CANCELLED');
    expect(old.cancelledAt).not.toBeNull();
    expect(rows.filter((x) => x.status === 'ACTIVE').map((x) => x.id)).toEqual([again.body.registration.id]);
  });

  it('TEST-78 AC-78 frees the place for another participant without exceeding capacity', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const p2 = await login('PARTICIPANT', 'p2@example.com');
    const e = await seedEvent(o.id, future(), 1);
    const r = await hold(e.id, p.user.id);
    const remaining = async () => (await request(app).get(`/api/events/${e.id}`).set('Cookie', p2.cookie)).body.remainingPlaces;

    expect((await cancel(r.id, p.cookie)).status).toBe(200);
    expect(await remaining()).toBe(1);
    const taken = await register(e.id, p2.cookie);

    expect(taken.status).toBe(201);
    expect(taken.body.remainingPlaces).toBe(0);
    expect((await row(r.id)).status).toBe('CANCELLED');
    const active = await prisma.registration.findMany({ where: { eventId: e.id, status: 'ACTIVE' } });
    expect(active.map((x) => x.participantId)).toEqual([p2.user.id]);
  });

  it('TEST-79 AC-79 does not count a cancelled registration as a BR-10 time conflict', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p = await login('PARTICIPANT', 'p@example.com');
    const t = future();
    const a = await seedEvent(o.id, t);
    const b = await seedEvent(o.id, new Date(t.getTime() + 60 * MIN));
    const r = await hold(a.id, p.user.id);

    expect((await cancel(r.id, p.cookie)).status).toBe(200);
    expect((await register(b.id, p.cookie)).status).toBe(201);

    const active = await prisma.registration.findMany({ where: { participantId: p.user.id, status: 'ACTIVE' } });
    expect(active.map((x) => x.eventId)).toEqual([b.id]);
    expect((await row(r.id)).status).toBe('CANCELLED');
  });
});
