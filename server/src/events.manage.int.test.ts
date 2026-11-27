import request, { type Test } from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

// F-08 (S2-04, #203): TEST-90 to TEST-104, TEST-108 and TEST-109 from docs/sprints/sprint-2/f-08-manage-event.md section 11.
const app = createApp();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const MISSING = '00000000-0000-4000-8000-000000000000';
const T = () => new Date(Math.floor((Date.now() + 7 * DAY) / MIN) * MIN);

// F-08 section 6.
const MESSAGES: Record<string, string> = {
  EVENT_NOT_EDITABLE: 'This event can no longer be edited.',
  EVENT_HAS_REGISTRATIONS: 'The start time cannot change while people are registered.',
  CAPACITY_BELOW_ACTIVE: 'Capacity cannot be lower than the number of registered participants.',
  EVENT_NOT_PUBLISHED: 'Only a published event can be closed.',
  ALREADY_CLOSED: 'This event is already closed.',
  ALREADY_CANCELLED: 'This event is already cancelled.',
  EVENT_CLOSED: 'This event is closed.',
  EVENT_STARTED: 'This event has already started.',
  INVALID_START_TIME: 'The start time must be in the future.',
};

afterEach(() => {
  vi.useRealTimers();
});

type Status = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';

async function signIn(role: 'PARTICIPANT' | 'ORGANIZER', email: string) {
  const user = await createUser(role, email);
  return { user, cookie: `sid=${await insertSession(user.id, new Date(Date.now() + 60 * MIN))}` };
}

function seedEvent(ownerId: string, data: { status?: Status; startsAt?: Date; capacity?: number; registrationDeadline?: Date; publishedAt?: Date | null } = {}) {
  const status = data.status ?? 'PUBLISHED';
  return prisma.event.create({
    data: {
      ownerId,
      title: 'Seeded event',
      description: '',
      location: 'Hall A',
      startsAt: T(),
      capacity: 5,
      status,
      publishedAt: status === 'DRAFT' ? null : new Date(Date.now() - DAY),
      ...data,
    },
  });
}

const hold = (eventId: string, participantId: string) => prisma.registration.create({ data: { eventId, participantId } });

const withCookie = (req: Test, cookie?: string) => (cookie ? req.set('Cookie', cookie) : req);
const patch = (id: string, body: object, cookie?: string) => withCookie(request(app).patch(`/api/events/${id}`), cookie).send(body);
const close = (id: string, cookie?: string) => withCookie(request(app).post(`/api/events/${id}/close`), cookie).send({});
const cancelEvent = (id: string, cookie?: string) => withCookie(request(app).post(`/api/events/${id}/cancel`), cookie).send({});
const register = (eventId: string, cookie: string) => request(app).post(`/api/events/${eventId}/registrations`).set('Cookie', cookie).send({});
const routes = [(id: string, cookie?: string) => patch(id, { title: 'Taken over' }, cookie), close, cancelEvent];

const event = (id: string) => prisma.event.findUniqueOrThrow({ where: { id } });
const registration = (id: string) => prisma.registration.findUniqueOrThrow({ where: { id } });
const snapshot = async () => [await prisma.event.findMany({ orderBy: { id: 'asc' } }), await prisma.registration.findMany({ orderBy: { id: 'asc' } })];
const activeCount = (eventId: string) => prisma.registration.count({ where: { eventId, status: 'ACTIVE' } });

// Freezes the server clock (the route's `new Date()`) for one request.
async function at(now: Date, call: () => Test) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  try {
    return await call();
  } finally {
    vi.useRealTimers();
  }
}

function expectError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  expect(Object.keys(error).filter((k) => !(k === 'details' && code === 'VALIDATION_ERROR')).sort()).toEqual(['code', 'message']);
  if (MESSAGES[code]) expect(error.message).toBe(MESSAGES[code]);
  return error;
}

describe('F-08 manage event API', () => {
  it('TEST-90 AC-90 edits title, description and location of the owner DRAFT and PUBLISHED event', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const edit = { title: 'Edited title', description: 'Edited description', location: 'Room 9' };
    for (const status of ['DRAFT', 'PUBLISHED'] as const) {
      const e = await seedEvent(o.user.id, { status });
      const res = await patch(e.id, edit, o.cookie);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: e.id, ...edit, startsAt: e.startsAt.toISOString(), capacity: e.capacity, status });
      expect(await event(e.id)).toEqual({ ...e, ...edit });
    }
  });

  it('TEST-91 AC-91 allows capacity equal to the ACTIVE count and rejects one below it', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const e = await seedEvent(o.user.id, { capacity: 5 });
    for (const n of [1, 2, 3]) await hold(e.id, (await createUser('PARTICIPANT', `p${n}@example.com`)).id);

    const equal = await patch(e.id, { capacity: 3 }, o.cookie);
    expect(equal.status).toBe(200);
    expect(equal.body).toMatchObject({ capacity: 3, remainingPlaces: 0 });
    expectError(await patch(e.id, { capacity: 2 }, o.cookie), 409, 'CAPACITY_BELOW_ACTIVE');
    expect((await event(e.id)).capacity).toBe(3);
    const raised = await patch(e.id, { capacity: 10000 }, o.cookie);
    expect(raised.status).toBe(200);
    expect((await event(e.id)).capacity).toBe(10000);
  });

  it('TEST-92 AC-92 lets exactly one of a concurrent capacity cut and a last-place registration succeed', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const holders = [await createUser('PARTICIPANT', 'p1@example.com'), await createUser('PARTICIPANT', 'p2@example.com')];
    const p3 = await signIn('PARTICIPANT', 'p3@example.com');
    for (let run = 0; run < 5; run++) {
      const e = await seedEvent(o.user.id, { capacity: 3, startsAt: new Date(T().getTime() + run * DAY) });
      for (const p of holders) await hold(e.id, p.id);

      const [cut, reg] = await Promise.all([patch(e.id, { capacity: 2 }, o.cookie), register(e.id, p3.cookie)]);

      expect([cut, reg].filter((r) => r.status >= 200 && r.status < 300)).toHaveLength(1);
      if (cut.status === 200) expectError(reg, 409, 'EVENT_FULL');
      else expectError(cut, 409, 'CAPACITY_BELOW_ACTIVE');
      expect(await activeCount(e.id)).toBeLessThanOrEqual((await event(e.id)).capacity);
    }
  });

  it('TEST-93 AC-93 refuses a startsAt change while registrations exist and accepts the stored value', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const held = await seedEvent(o.user.id);
    await hold(held.id, (await createUser('PARTICIPANT', 'p1@example.com')).id);

    expectError(await patch(held.id, { startsAt: new Date(held.startsAt.getTime() + 60 * MIN).toISOString() }, o.cookie), 409, 'EVENT_HAS_REGISTRATIONS');
    expect(await event(held.id)).toEqual(held);
    expect((await patch(held.id, { startsAt: held.startsAt.toISOString() }, o.cookie)).status).toBe(200);
    expect((await event(held.id)).startsAt).toEqual(held.startsAt);

    const free = await seedEvent(o.user.id);
    const later = new Date(free.startsAt.getTime() + 60 * MIN);
    const moved = await patch(free.id, { startsAt: later.toISOString() }, o.cookie);
    expect(moved.status).toBe(200);
    expect(moved.body.startsAt).toBe(later.toISOString());
    expect((await event(free.id)).startsAt).toEqual(later);
  });

  it('TEST-94 AC-94 rejects a startsAt at or before now and one earlier than the stored deadline', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const t = T();
    const e = await seedEvent(o.user.id, { startsAt: t });
    const d = await seedEvent(o.user.id, { startsAt: t, registrationDeadline: new Date(t.getTime() - 60 * MIN) });
    const before = await snapshot();
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    expectError(await at(now, () => patch(e.id, { startsAt: now.toISOString() }, o.cookie)), 400, 'INVALID_START_TIME');
    expectError(await patch(e.id, { startsAt: new Date(Date.now() - 60 * MIN).toISOString() }, o.cookie), 400, 'INVALID_START_TIME');
    expectError(await patch(d.id, { startsAt: new Date(t.getTime() - 120 * MIN).toISOString() }, o.cookie), 400, 'INVALID_DEADLINE');

    expect(await snapshot()).toEqual(before);
  });

  it('TEST-95 AC-95 rejects an empty, unknown, wrongly typed or out-of-bounds edit and a bad ID or content type', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const e = await seedEvent(o.user.id);
    const before = await snapshot();
    const bodies = [{}, { status: 'CLOSED' }, { ownerId: o.user.id }, { capacity: '5' }, { capacity: 0 }, { capacity: 10001 }, { title: 'x'.repeat(121) }];
    const cases = [
      ...bodies.map((body) => patch(e.id, body, o.cookie)),
      patch('not-a-uuid', { title: 'New title' }, o.cookie),
      request(app).patch(`/api/events/${e.id}`).set('Cookie', o.cookie).set('Content-Type', 'text/plain').send(JSON.stringify({ title: 'New title' })),
    ];

    for (const c of cases) {
      const error = expectError(await c, 400, 'VALIDATION_ERROR');
      expect(error.details?.length).toBeGreaterThan(0);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('TEST-96 AC-96 refuses to edit a started, a CLOSED and a CANCELLED event', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const started = await seedEvent(o.user.id, { startsAt: new Date(Date.now() - 60 * MIN) });
    const closed = await seedEvent(o.user.id, { status: 'CLOSED' });
    const cancelled = await seedEvent(o.user.id, { status: 'CANCELLED' });
    const before = await snapshot();

    expectError(await patch(started.id, { title: 'New title' }, o.cookie), 409, 'EVENT_STARTED');
    for (const e of [closed, cancelled]) expectError(await patch(e.id, { title: 'New title' }, o.cookie), 409, 'EVENT_NOT_EDITABLE');

    expect(await snapshot()).toEqual(before);
  });

  it('TEST-97 AC-97 closes a PUBLISHED event, keeps it listed and its registrations, and refuses new ones', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p2 = await signIn('PARTICIPANT', 'p2@example.com');
    const e = await seedEvent(o.user.id);
    const r = await hold(e.id, (await createUser('PARTICIPANT', 'p1@example.com')).id);

    const res = await close(e.id, o.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: e.id, status: 'CLOSED' });
    expect((await event(e.id)).status).toBe('CLOSED');
    const list = await request(app).get('/api/events').set('Cookie', p2.cookie);
    expect(list.status).toBe(200);
    expect(list.body.events.find((x: { id: string }) => x.id === e.id)).toMatchObject({ status: 'CLOSED' });
    expect(await registration(r.id)).toEqual(r);

    expectError(await register(e.id, p2.cookie), 409, 'EVENT_CLOSED');
    expect(await prisma.registration.count({ where: { participantId: p2.user.id } })).toBe(0);
  });

  it('TEST-98 AC-98 refuses to close a DRAFT, a CANCELLED and a CLOSED event', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const draft = await seedEvent(o.user.id, { status: 'DRAFT' });
    const cancelled = await seedEvent(o.user.id, { status: 'CANCELLED' });
    const closed = await seedEvent(o.user.id, { status: 'CLOSED' });
    const before = await snapshot();

    for (const e of [draft, cancelled]) expectError(await close(e.id, o.cookie), 409, 'EVENT_NOT_PUBLISHED');
    expectError(await close(closed.id, o.cookie), 409, 'ALREADY_CLOSED');

    expect(await snapshot()).toEqual(before);
  });

  it('TEST-99 AC-99 cancels an event with its ACTIVE registrations and hides it from everyone but the owner', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const o2 = await signIn('ORGANIZER', 'o2@example.com');
    const p3 = await signIn('PARTICIPANT', 'p3@example.com');
    const e = await seedEvent(o.user.id);
    const rows = [await hold(e.id, (await createUser('PARTICIPANT', 'p1@example.com')).id), await hold(e.id, (await createUser('PARTICIPANT', 'p2@example.com')).id)];

    const res = await cancelEvent(e.id, o.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: e.id, status: 'CANCELLED', remainingPlaces: e.capacity });
    for (const r of rows) {
      const stored = await registration(r.id);
      expect(stored.status).toBe('CANCELLED');
      expect(stored.cancelledAt).not.toBeNull();
    }
    const list = await request(app).get('/api/events').set('Cookie', p3.cookie);
    expect(list.body.events.map((x: { id: string }) => x.id)).not.toContain(e.id);
    for (const c of [p3.cookie, o2.cookie]) expectError(await request(app).get(`/api/events/${e.id}`).set('Cookie', c), 404, 'EVENT_NOT_FOUND');
    const own = await request(app).get(`/api/events/${e.id}`).set('Cookie', o.cookie);
    expect(own.status).toBe(200);
    expect(own.body.status).toBe('CANCELLED');
    const mine = await request(app).get('/api/events/mine').set('Cookie', o.cookie);
    expect(mine.body.events.find((x: { id: string }) => x.id === e.id)).toMatchObject({ status: 'CANCELLED' });
    expectError(await register(e.id, p3.cookie), 404, 'EVENT_NOT_FOUND');
    expect(await prisma.registration.count({ where: { participantId: p3.user.id } })).toBe(0);

    for (const status of ['DRAFT', 'CLOSED'] as const) {
      const other = await seedEvent(o.user.id, { status });
      expect((await cancelEvent(other.id, o.cookie)).status).toBe(200);
      expect((await event(other.id)).status).toBe('CANCELLED');
    }
  });

  it('TEST-100 AC-100 refuses to cancel a CANCELLED event and cancels a started one with its registrations', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const cancelled = await seedEvent(o.user.id, { status: 'CANCELLED' });
    const before = await snapshot();
    expectError(await cancelEvent(cancelled.id, o.cookie), 409, 'ALREADY_CANCELLED');
    expect(await snapshot()).toEqual(before);

    const started = await seedEvent(o.user.id, { startsAt: new Date(Date.now() - 60 * MIN) });
    const r = await hold(started.id, (await createUser('PARTICIPANT', 'p1@example.com')).id);
    const res = await cancelEvent(started.id, o.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: started.id, status: 'CANCELLED' });
    const stored = await registration(r.id);
    expect(stored.status).toBe('CANCELLED');
    expect(stored.cancelledAt).not.toBeNull();
  });

  it('TEST-101 AC-101 never leaves an ACTIVE registration on an event cancelled at the same time', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    for (let run = 0; run < 5; run++) {
      const e = await seedEvent(o.user.id, { startsAt: new Date(T().getTime() + run * DAY) });

      const [cancelled, reg] = await Promise.all([cancelEvent(e.id, o.cookie), register(e.id, p1.cookie)]);

      expect(cancelled.status).toBe(200);
      expect([201, 404]).toContain(reg.status);
      if (reg.status === 404) expectError(reg, 404, 'EVENT_NOT_FOUND');
      expect(await activeCount(e.id)).toBe(0);
      expect((await event(e.id)).status).toBe('CANCELLED');
    }
  });

  it('TEST-102 AC-102 refuses participants with 403 and other organizers with 403 or 404 on all three routes', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const o2 = await signIn('ORGANIZER', 'o2@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const draft = await seedEvent(o.user.id, { status: 'DRAFT' });
    const published = await seedEvent(o.user.id);
    const closed = await seedEvent(o.user.id, { status: 'CLOSED' });
    const cancelled = await seedEvent(o.user.id, { status: 'CANCELLED' });
    const before = await snapshot();

    for (const call of routes) {
      for (const id of [draft.id, published.id, MISSING]) expectError(await call(id, p1.cookie), 403, 'FORBIDDEN');
      for (const [id, status, code] of [
        [published.id, 403, 'FORBIDDEN'],
        [closed.id, 403, 'FORBIDDEN'],
        [draft.id, 404, 'EVENT_NOT_FOUND'],
        [cancelled.id, 404, 'EVENT_NOT_FOUND'],
        [MISSING, 404, 'EVENT_NOT_FOUND'],
      ] as const) {
        expectError(await call(id, o2.cookie), status, code);
      }
    }
    expect(await snapshot()).toEqual(before);
  });

  it('TEST-103 AC-103 returns 401 on all three routes for no, unknown, expired and logged-out sessions', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const e = await seedEvent(o.id);
    const login = await request(app).post('/api/auth/login').send({ email: o.email, password: PASSWORD });
    const revoked = `sid=${sidFrom(login)}`;
    expect((await request(app).post('/api/auth/logout').set('Cookie', revoked).send({})).status).toBe(204);
    const before = await snapshot();

    for (const call of routes) {
      const expired = `sid=${await insertSession(o.id, new Date(Date.now() - 1000))}`;
      for (const cookie of [undefined, 'sid=unknown-token', expired, revoked]) expectError(await call(e.id, cookie), 401, 'UNAUTHENTICATED');
    }
    expect(await snapshot()).toEqual(before);
  });

  it('TEST-104 AC-104 keeps refusing to publish a CANCELLED former DRAFT and a CLOSED event', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const t = T();
    const events = [await seedEvent(o.user.id, { status: 'CANCELLED', publishedAt: null, startsAt: t }), await seedEvent(o.user.id, { status: 'CLOSED', startsAt: t })];
    const before = await snapshot();

    for (const e of events) expectError(await request(app).post(`/api/events/${e.id}/publish`).set('Cookie', o.cookie).send({}), 409, 'ALREADY_PUBLISHED');

    expect(await snapshot()).toEqual(before);
  });

  it('TEST-108 AC-108 shows a registration cancelled by an event cancel as CANCELLED in My registrations', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const e = await seedEvent(o.user.id);
    const r = await hold(e.id, p1.user.id);

    expect((await cancelEvent(e.id, o.cookie)).status).toBe(200);
    const mine = await request(app).get('/api/registrations/mine').set('Cookie', p1.cookie);

    expect(mine.status).toBe(200);
    expect(mine.body.registrations.find((x: { id: string }) => x.id === r.id)).toMatchObject({ status: 'CANCELLED', cancelledAt: expect.any(String) });
  });

  it('TEST-109 AC-109 keeps the cancelled roster for the owner and hides it from another organizer', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const o2 = await signIn('ORGANIZER', 'o2@example.com');
    const e = await seedEvent(o.user.id);
    for (const n of [1, 2]) await hold(e.id, (await createUser('PARTICIPANT', `p${n}@example.com`)).id);

    expect((await cancelEvent(e.id, o.cookie)).status).toBe(200);
    const roster = await request(app).get(`/api/events/${e.id}/registrations`).set('Cookie', o.cookie);

    expect(roster.status).toBe(200);
    expect(roster.body.registrations.map((x: { status: string }) => x.status)).toEqual(['CANCELLED', 'CANCELLED']);
    expectError(await request(app).get(`/api/events/${e.id}/registrations`).set('Cookie', o2.cookie), 404, 'EVENT_NOT_FOUND');
  });
});
