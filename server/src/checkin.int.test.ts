import request, { type Test } from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

// F-10 (S3-02, #207): TEST-110, TEST-111, TEST-113, TEST-114 (a), TEST-115 to TEST-118 from
// docs/sprints/sprint-3/f-10-checkin.md section 11. TEST-112 and TEST-114 (b) call the check-in service
// with a fixed `now` and are added in the green commit (contract section 11).
// The `CheckIn` table is added by the green migration, so these tests never use a Prisma `checkIn` model:
// they create check-ins through the API and count them with raw SQL after the status assertion.
const app = createApp();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MISSING = '00000000-0000-4000-8000-000000000000';

// F-10 section 6 and F-07.
const MESSAGES: Record<string, string> = {
  REGISTRATION_NOT_ACTIVE: 'Only an active registration can be checked in.',
  ALREADY_CHECKED_IN: 'This participant is already checked in.',
  OUTSIDE_CHECKIN_WINDOW: 'Check-in is open from 60 minutes before the start until 6 hours after it.',
  NOT_FOUND: 'Registration not found.',
  FORBIDDEN: 'You do not have access to this.',
};

async function signIn(role: 'PARTICIPANT' | 'ORGANIZER', email: string) {
  const user = await createUser(role, email);
  return { user, cookie: `sid=${await insertSession(user.id, new Date(Date.now() + 60 * MIN))}` };
}

// F-02 accepts only a future start, so events near or before now are inserted directly (contract section 11).
function seedEvent(ownerId: string, startsAt: Date) {
  return prisma.event.create({
    data: { ownerId, title: 'Check-in fixture', description: '', location: 'Hall A', startsAt, capacity: 10, status: 'PUBLISHED', publishedAt: new Date(Date.now() - DAY) },
  });
}

const withCookie = (req: Test, cookie?: string) => (cookie ? req.set('Cookie', cookie) : req);
const checkIn = (id: string, cookie?: string, body: object = {}) => withCookie(request(app).post(`/api/registrations/${id}/check-in`), cookie).send(body);
const register = (eventId: string, cookie: string) => request(app).post(`/api/events/${eventId}/registrations`).set('Cookie', cookie).send({});
const cancelRegistration = (id: string, cookie: string) => request(app).post(`/api/registrations/${id}/cancel`).set('Cookie', cookie).send({});
const cancelEvent = (id: string, cookie: string) => request(app).post(`/api/events/${id}/cancel`).set('Cookie', cookie).send({});

// A registration of a started event cannot go through F-04, so it is inserted directly, like its event.
const hold = (eventId: string, participantId: string) => prisma.registration.create({ data: { eventId, participantId } });

async function registered(eventId: string, cookie: string) {
  const res = await register(eventId, cookie);
  expect(res.status).toBe(201);
  return res.body.registration.id as string;
}

type CheckInRow = { registrationId: string; checkedInAt: Date; checkedInById: string };
const checkInRows = (registrationId: string) =>
  prisma.$queryRaw<CheckInRow[]>`SELECT "registrationId"::text AS "registrationId", "checkedInAt", "checkedInById"::text AS "checkedInById" FROM "CheckIn" WHERE "registrationId" = ${registrationId}::uuid`;
const checkInCount = async () => Number((await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "CheckIn"`)[0].n);

function expectError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  expect(Object.keys(error).sort()).toEqual(['code', 'message']);
  if (MESSAGES[code]) expect(error.message).toBe(MESSAGES[code]);
}

describe('F-10 check-in API', () => {
  it('TEST-110 AC-110 checks in an ACTIVE registration of a PUBLISHED and of a CLOSED event inside the window', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const p2 = await signIn('PARTICIPANT', 'p2@example.com');
    const p3 = await signIn('PARTICIPANT', 'p3@example.com');
    const e = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r1 = await registered(e.id, p1.cookie);
    await registered(e.id, p2.cookie);
    const c = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r3 = await registered(c.id, p3.cookie);
    expect((await request(app).post(`/api/events/${c.id}/close`).set('Cookie', o.cookie).send({})).status).toBe(200);

    for (const [id, who] of [[r1, p1], [r3, p3]] as const) {
      const res = await checkIn(id, o.cookie);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        registration: {
          id, status: 'ACTIVE', createdAt: expect.any(String), checkedInAt: expect.any(String),
          participant: { name: who.user.name, email: who.user.email },
        },
      });
      const rows = await checkInRows(id);
      expect(rows).toHaveLength(1);
      expect(rows[0].checkedInById).toBe(o.user.id);
      expect(rows[0].checkedInAt.toISOString()).toBe(res.body.registration.checkedInAt);
    }

    const roster = await request(app).get(`/api/events/${e.id}/registrations`).set('Cookie', o.cookie);
    expect(roster.status).toBe(200);
    const byEmail = Object.fromEntries(roster.body.registrations.map((x: { participant: { email: string }; checkedInAt: string | null }) => [x.participant.email, x.checkedInAt]));
    expect(byEmail['p1@example.com']).toEqual(expect.any(String));
    expect(byEmail['p2@example.com']).toBeNull();
  });

  it('TEST-111 AC-111 accepts inside and refuses outside the window, with the start set from the real clock', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const cases = [
      { offset: 59 * MIN, status: 201 },
      { offset: 61 * MIN, status: 409 },
      { offset: -(5 * HOUR + 59 * MIN), status: 201 },
      { offset: -(6 * HOUR + 1 * MIN), status: 409 },
    ];
    for (const [i, { offset, status }] of cases.entries()) {
      const p = await createUser('PARTICIPANT', `p${i}@example.com`);
      const e = await seedEvent(o.user.id, new Date(Date.now() + offset));
      const r = await hold(e.id, p.id);
      const res = await checkIn(r.id, o.cookie);
      if (status === 201) expect(res.status).toBe(201);
      else expectError(res, 409, 'OUTSIDE_CHECKIN_WINDOW');
      expect(await checkInRows(r.id)).toHaveLength(status === 201 ? 1 : 0);
    }
  });

  it('TEST-113 AC-113 refuses a registration cancelled by its participant or by an event cancel, inside and outside the window', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const p2 = await signIn('PARTICIPANT', 'p2@example.com');
    const p3 = await signIn('PARTICIPANT', 'p3@example.com');
    const a = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r1 = await registered(a.id, p1.cookie);
    expect((await cancelRegistration(r1, p1.cookie)).status).toBe(200);
    const b = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r2 = await registered(b.id, p2.cookie);
    expect((await cancelEvent(b.id, o.cookie)).status).toBe(200);
    const c = await seedEvent(o.user.id, new Date(Date.now() + 7 * DAY));
    const r3 = await registered(c.id, p3.cookie);
    expect((await cancelRegistration(r3, p3.cookie)).status).toBe(200);

    for (const id of [r1, r2, r3]) expectError(await checkIn(id, o.cookie), 409, 'REGISTRATION_NOT_ACTIVE');
    expect(await checkInCount()).toBe(0);
  });

  it('TEST-114 (a) AC-114 refuses a second check-in inside the window and keeps the first one', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const e = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r = await registered(e.id, p1.cookie);
    expect((await checkIn(r, o.cookie)).status).toBe(201);
    const [first] = await checkInRows(r);

    expectError(await checkIn(r, o.cookie), 409, 'ALREADY_CHECKED_IN');
    expect(await checkInRows(r)).toEqual([first]);
  });

  it('TEST-115 AC-115 lets exactly one of two simultaneous check-ins succeed, five times', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    for (let run = 0; run < 5; run++) {
      const p = await createUser('PARTICIPANT', `p${run}@example.com`);
      const e = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
      const r = await hold(e.id, p.id);
      const results = await Promise.all([checkIn(r.id, o.cookie), checkIn(r.id, o.cookie)]);
      expect(results.map((x) => x.status).sort()).toEqual([201, 409]);
      expectError(results.find((x) => x.status === 409)!, 409, 'ALREADY_CHECKED_IN');
      expect(await checkInRows(r.id)).toHaveLength(1);
    }
  });

  it('TEST-116 AC-116 refuses participants, another organizer, unknown and malformed requests', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const o2 = await signIn('ORGANIZER', 'o2@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const p2 = await signIn('PARTICIPANT', 'p2@example.com');
    const e = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r1 = await registered(e.id, p1.cookie);
    const r2 = await registered(e.id, p2.cookie);

    for (const id of [r1, r2, MISSING]) expectError(await checkIn(id, p1.cookie), 403, 'FORBIDDEN');
    expectError(await checkIn(r1, o2.cookie), 403, 'FORBIDDEN');
    expectError(await checkIn(MISSING, o.cookie), 404, 'NOT_FOUND');

    const badId = await checkIn('not-a-uuid', o.cookie);
    expect(badId.status).toBe(400);
    expect(errorBody(badId).code).toBe('VALIDATION_ERROR'); // 400 may add `details` (system SDS 4.2, contract section 11)
    expect(errorBody(badId).details!.some((d) => d.field === 'id')).toBe(true);
    const badBody = await checkIn(r1, o.cookie, { checkedInAt: '2026-01-01T00:00:00Z' });
    expect(badBody.status).toBe(400);
    expect(errorBody(badBody).code).toBe('VALIDATION_ERROR');
    expect(errorBody(badBody).details!.length).toBeGreaterThan(0);
    const textBody = await request(app).post(`/api/registrations/${r1}/check-in`).set('Cookie', o.cookie).set('Content-Type', 'text/plain').send('{}');
    expect(textBody.status).toBe(400);
    expect(errorBody(textBody).code).toBe('VALIDATION_ERROR');

    expect(await checkInCount()).toBe(0);
  });

  it('TEST-117 AC-117 returns 401 without a valid session', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const e = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r = await registered(e.id, p1.cookie);
    const expired = await insertSession(o.user.id, new Date(Date.now() - 1000));
    await createUser('ORGANIZER', 'o-old@example.com');
    const login = await request(app).post('/api/auth/login').send({ email: 'o-old@example.com', password: PASSWORD });
    const oldCookie = `sid=${sidFrom(login)}`;
    expect((await request(app).post('/api/auth/logout').set('Cookie', oldCookie).send({})).status).toBe(204);

    for (const cookie of [undefined, 'sid=unknown-token', `sid=${expired}`, oldCookie]) {
      expectError(await checkIn(r, cookie), 401, 'UNAUTHENTICATED');
    }
    expect(await checkInCount()).toBe(0);
  });

  it('TEST-118 AC-118 refuses to cancel a registration that was checked in before the start', async () => {
    const o = await signIn('ORGANIZER', 'o@example.com');
    const p1 = await signIn('PARTICIPANT', 'p1@example.com');
    const e = await seedEvent(o.user.id, new Date(Date.now() + 30 * MIN));
    const r = await registered(e.id, p1.cookie);
    expect((await checkIn(r, o.cookie)).status).toBe(201);

    const res = await cancelRegistration(r, p1.cookie);
    expect(res.status).toBe(409);
    const error = errorBody(res);
    expect(error.code).toBe('ALREADY_CHECKED_IN');
    expect(error.message).toBe('A checked-in registration cannot be cancelled.');
    expect((await prisma.registration.findUniqueOrThrow({ where: { id: r } })).status).toBe('ACTIVE');
    expect(await checkInRows(r)).toHaveLength(1);
  });
});
