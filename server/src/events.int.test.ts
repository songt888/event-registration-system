import request, { type Test } from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { createUser, errorBody, insertSession } from '../test/fixtures';

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;
const MISSING = '00000000-0000-4000-8000-000000000000';
const PAYLOAD_KEYS = ['capacity', 'description', 'id', 'location', 'remainingPlaces', 'startsAt', 'status', 'title'];

const hour = () => new Date(Date.now() + 60 * 60 * 1000);
const valid = () => ({
  title: 'Intro to Testing',
  description: 'Synthetic demo event',
  location: 'Room 101',
  startsAt: new Date(Date.now() + 7 * DAY).toISOString(),
  capacity: 10,
});

async function signIn(role: 'PARTICIPANT' | 'ORGANIZER', email: string) {
  const user = await createUser(role, email);
  return { user, cookie: `sid=${await insertSession(user.id, hour())}` };
}

function seedEvent(ownerId: string, data: { status?: 'DRAFT' | 'PUBLISHED'; startsAt?: Date; capacity?: number } = {}) {
  return prisma.event.create({
    data: {
      ownerId,
      title: 'Seeded event',
      description: '',
      location: 'Hall A',
      startsAt: new Date(Date.now() + DAY),
      capacity: 5,
      publishedAt: data.status === 'PUBLISHED' ? new Date(Date.now() - DAY) : null,
      ...data,
    },
  });
}

const allEvents = () => prisma.event.findMany({ orderBy: { id: 'asc' } });

function expectError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  for (const d of error.details ?? []) expect(d).toEqual({ field: expect.any(String), message: expect.any(String) });
  expect(res.text).not.toMatch(/passwordHash|tokenHash|"stack":|"ownerId":|"title":|"capacity":/);
  return error;
}

const payloadOf = (e: { id: string; title: string; description: string; location: string; startsAt: Date; capacity: number; status: string }, remainingPlaces = e.capacity) => ({
  id: e.id,
  title: e.title,
  description: e.description,
  location: e.location,
  startsAt: e.startsAt.toISOString(),
  capacity: e.capacity,
  remainingPlaces,
  status: e.status,
});

describe('F-02 publish event API', () => {
  it.each([1, 10000])('TEST-06 AC-06 creates a DRAFT owned by the session user with capacity %i', async (capacity) => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const startsAt = new Date(Date.now() + 7 * DAY);
    const local = new Date(startsAt.getTime() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');
    const res = await request(app).post('/api/events').set('Cookie', cookie).send({ ...valid(), startsAt: local, capacity });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(PAYLOAD_KEYS);
    const row = await prisma.event.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row).toMatchObject({ ownerId: user.id, status: 'DRAFT', publishedAt: null, capacity, title: 'Intro to Testing', location: 'Room 101' });
    expect(row.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(res.body).toEqual(payloadOf(row));
  });

  it.each([0, -1, 1.5, 10001, '10'])('TEST-07 AC-07 rejects capacity %j with 400 and stores nothing', async (capacity) => {
    const { cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const res = await request(app).post('/api/events').set('Cookie', cookie).send({ ...valid(), capacity });
    expectError(res, 400, 'VALIDATION_ERROR');
    expect(await prisma.event.count()).toBe(0);
  });

  it('TEST-08 AC-08 rejects a participant create with 403 and stores nothing', async () => {
    const { cookie } = await signIn('PARTICIPANT', 'p1@example.com');
    const res = await request(app).post('/api/events').set('Cookie', cookie).send(valid());
    expectError(res, 403, 'FORBIDDEN');
    expect(await prisma.event.count()).toBe(0);
  });

  it('TEST-09 AC-09 returns 401 on every F-02 route for no, invalid, expired and revoked sessions', async () => {
    const { user, cookie: revoked } = await signIn('ORGANIZER', 'o1@example.com');
    expect((await request(app).post('/api/auth/logout').set('Cookie', revoked).send({})).status).toBe(204);
    const draft = await seedEvent(user.id);
    const before = await allEvents();
    const calls: ((t: (r: Test) => Test) => Test)[] = [
      (t) => t(request(app).post('/api/events')).send(valid()),
      (t) => t(request(app).get('/api/events/mine')),
      (t) => t(request(app).get(`/api/events/${draft.id}`)),
      (t) => t(request(app).post(`/api/events/${draft.id}/publish`)).send({}),
    ];
    for (const call of calls) {
      const expired = `sid=${await insertSession(user.id, new Date(Date.now() - 1000))}`;
      for (const cookie of [undefined, 'sid=unknown-token', expired, revoked]) {
        const res = await call((r) => (cookie ? r.set('Cookie', cookie) : r));
        expectError(res, 401, 'UNAUTHENTICATED');
      }
    }
    expect(await allEvents()).toEqual(before);
  });

  it('TEST-25 AC-25 publishes the owner DRAFT and persists PUBLISHED with publishedAt', async () => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const draft = await seedEvent(user.id);
    const res = await request(app).post(`/api/events/${draft.id}/publish`).set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
    const row = await prisma.event.findUniqueOrThrow({ where: { id: draft.id } });
    expect(row.status).toBe('PUBLISHED');
    expect(row.publishedAt).toBeInstanceOf(Date);
    expect(row).toMatchObject({ title: draft.title, startsAt: draft.startsAt, capacity: draft.capacity, ownerId: user.id });
    expect(res.body).toEqual(payloadOf(row));
  });

  it('TEST-26 AC-26 returns 404 when another organizer publishes the owner DRAFT', async () => {
    const { user } = await signIn('ORGANIZER', 'o1@example.com');
    const { cookie } = await signIn('ORGANIZER', 'o2@example.com');
    const draft = await seedEvent(user.id);
    const res = await request(app).post(`/api/events/${draft.id}/publish`).set('Cookie', cookie).send({});
    expectError(res, 404, 'EVENT_NOT_FOUND');
    expect(await allEvents()).toEqual([draft]);
  });

  it('TEST-29 AC-29 rejects create with a past startsAt and stores nothing', async () => {
    const { cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const res = await request(app).post('/api/events').set('Cookie', cookie).send({ ...valid(), startsAt: new Date(Date.now() - DAY).toISOString() });
    expectError(res, 400, 'INVALID_START_TIME');
    expect(await prisma.event.count()).toBe(0);
  });

  it('TEST-30 AC-30 rejects publishing an owner DRAFT whose start has passed', async () => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const draft = await seedEvent(user.id, { startsAt: new Date(Date.now() - DAY) });
    const res = await request(app).post(`/api/events/${draft.id}/publish`).set('Cookie', cookie).send({});
    expectError(res, 400, 'INVALID_START_TIME');
    expect(await allEvents()).toEqual([draft]);
  });

  it('TEST-31 AC-31 returns the owner DRAFT by ID', async () => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const draft = await seedEvent(user.id);
    const res = await request(app).get(`/api/events/${draft.id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(payloadOf(draft));
    expect(res.body.status).toBe('DRAFT');
  });

  it('TEST-32 AC-32 gives participants and other organizers the same 404 for a DRAFT and a missing ID', async () => {
    const { user } = await signIn('ORGANIZER', 'o1@example.com');
    const draft = await seedEvent(user.id);
    const callers = [await signIn('PARTICIPANT', 'p1@example.com'), await signIn('ORGANIZER', 'o2@example.com')];
    const bodies: unknown[] = [];
    for (const { cookie } of callers) {
      for (const id of [draft.id, MISSING]) {
        const res = await request(app).get(`/api/events/${id}`).set('Cookie', cookie);
        expectError(res, 404, 'EVENT_NOT_FOUND');
        bodies.push(res.body);
      }
    }
    for (const body of bodies) expect(body).toEqual(bodies[0]);
  });

  it('TEST-33 AC-33 lists only the caller events of both statuses ordered by startsAt then id', async () => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const { user: other } = await signIn('ORGANIZER', 'o2@example.com');
    const { cookie: third } = await signIn('ORGANIZER', 'o3@example.com');
    const sameStart = new Date(Date.now() + 3 * DAY);
    const own = [
      await seedEvent(user.id, { status: 'PUBLISHED', startsAt: new Date(Date.now() + 5 * DAY) }),
      await seedEvent(user.id, { startsAt: sameStart }),
      await seedEvent(user.id, { status: 'PUBLISHED', startsAt: sameStart }),
      await seedEvent(user.id, { startsAt: new Date(Date.now() + DAY) }),
    ];
    await seedEvent(other.id);
    await seedEvent(other.id, { status: 'PUBLISHED' });
    const expected = [...own].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || (a.id < b.id ? -1 : 1));
    const res = await request(app).get('/api/events/mine').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ events: expected.map((e) => payloadOf(e)) });
    const empty = await request(app).get('/api/events/mine').set('Cookie', third);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ events: [] });
  });

  it('TEST-34 AC-34 rejects a participant My events request with 403', async () => {
    const { user } = await signIn('ORGANIZER', 'o1@example.com');
    await seedEvent(user.id);
    const { cookie } = await signIn('PARTICIPANT', 'p1@example.com');
    const res = await request(app).get('/api/events/mine').set('Cookie', cookie);
    expectError(res, 403, 'FORBIDDEN');
  });

  it('TEST-36 AC-36 returns 409 when the owner republishes, including after the start passed', async () => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const events = [await seedEvent(user.id, { status: 'PUBLISHED' }), await seedEvent(user.id, { status: 'PUBLISHED', startsAt: new Date(Date.now() - DAY) })];
    const before = await allEvents();
    for (const e of events) {
      const res = await request(app).post(`/api/events/${e.id}/publish`).set('Cookie', cookie).send({});
      expectError(res, 409, 'ALREADY_PUBLISHED');
    }
    expect(await allEvents()).toEqual(before);
  });

  it('TEST-49 AC-49 returns a PUBLISHED event to every role with remainingPlaces from ACTIVE registrations', async () => {
    const owner = await signIn('ORGANIZER', 'o1@example.com');
    const participant = await signIn('PARTICIPANT', 'p1@example.com');
    const other = await signIn('ORGANIZER', 'o2@example.com');
    const p2 = await createUser('PARTICIPANT', 'p2@example.com');
    const open = await seedEvent(owner.user.id, { status: 'PUBLISHED', capacity: 5 });
    const full = await seedEvent(owner.user.id, { status: 'PUBLISHED', capacity: 2 });
    for (const eventId of [open.id, full.id]) {
      await prisma.registration.createMany({ data: [participant.user.id, p2.id].map((participantId) => ({ eventId, participantId })) });
    }
    for (const { cookie } of [participant, owner, other]) {
      for (const [event, remaining] of [[open, 3], [full, 0]] as const) {
        const res = await request(app).get(`/api/events/${event.id}`).set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(payloadOf(event, remaining));
      }
    }
  });

  it('TEST-50 AC-50 applies role before lookup and ownership before state on publish', async () => {
    const { user } = await signIn('ORGANIZER', 'o1@example.com');
    const participant = await signIn('PARTICIPANT', 'p1@example.com');
    const other = await signIn('ORGANIZER', 'o2@example.com');
    const draft = await seedEvent(user.id);
    const published = await seedEvent(user.id, { status: 'PUBLISHED' });
    const before = await allEvents();
    const bodies: unknown[] = [];
    for (const id of [draft.id, published.id, MISSING]) {
      const res = await request(app).post(`/api/events/${id}/publish`).set('Cookie', participant.cookie).send({});
      expectError(res, 403, 'FORBIDDEN');
      bodies.push(res.body);
    }
    for (const body of bodies) expect(body).toEqual(bodies[0]);
    const foreign = await request(app).post(`/api/events/${published.id}/publish`).set('Cookie', other.cookie).send({});
    expectError(foreign, 403, 'FORBIDDEN');
    const missing = await request(app).post(`/api/events/${MISSING}/publish`).set('Cookie', other.cookie).send({});
    expectError(missing, 404, 'EVENT_NOT_FOUND');
    expect(await allEvents()).toEqual(before);
  });

  it('TEST-51 AC-51 rejects malformed create, publish and ID input with 400 and no writes', async () => {
    const { user, cookie } = await signIn('ORGANIZER', 'o1@example.com');
    const draft = await seedEvent(user.id);
    const before = await allEvents();
    const { title: _title, ...missingTitle } = valid();
    const bodies: unknown[] = [
      { ...valid(), title: '' },
      { ...valid(), title: '   ' },
      { ...valid(), title: 'x'.repeat(121) },
      { ...valid(), title: 42 },
      { ...valid(), location: '' },
      { ...valid(), location: 'x'.repeat(121) },
      { ...valid(), description: 'x'.repeat(2001) },
      { ...valid(), description: null },
      missingTitle,
      { ...valid(), startsAt: 'next friday' },
      { ...valid(), startsAt: '2027-01-01T10:00:00' },
      { ...valid(), ownerId: user.id },
      { ...valid(), status: 'PUBLISHED' },
      { ...valid(), publishedAt: new Date().toISOString() },
      [valid()],
    ];
    const post = () => request(app).post('/api/events').set('Cookie', cookie);
    const cases = [
      ...bodies.map((b) => post().send(b as object)),
      post().set('Content-Type', 'application/json').send('{bad'),
      post().set('Content-Type', 'text/plain').send(JSON.stringify(valid())),
      request(app).post(`/api/events/${draft.id}/publish`).set('Cookie', cookie).send({ status: 'PUBLISHED' }),
      request(app).get('/api/events/not-a-uuid').set('Cookie', cookie),
      request(app).post('/api/events/not-a-uuid/publish').set('Cookie', cookie).send({}),
    ];
    for (const c of cases) expectError(await c, 400, 'VALIDATION_ERROR');
    expect(await allEvents()).toEqual(before);
  });
});
