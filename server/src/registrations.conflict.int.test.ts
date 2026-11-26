import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, sidFrom } from '../test/fixtures';

// CR-01 (Lab 7): BR-10 rejects a registration whose event starts less than 120 minutes from another ACTIVE
// registration of the same participant. F-04 contract v1.7, AC-57 to AC-60, STS TEST-57 to TEST-60.
const app = createApp();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
// A fixed future time on a whole minute, so the 119 / 120 minute arithmetic is exact.
const T = new Date(Math.floor((Date.now() + 7 * DAY) / MIN) * MIN);
const at = (minutes: number) => new Date(T.getTime() + minutes * MIN);
const CONFLICT_MESSAGE = 'You are already registered for another event that starts within 2 hours of this one.';

async function login(email: string) {
  const user = await createUser('PARTICIPANT', email);
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { user, cookie: `sid=${sidFrom(res)}` };
}

function seedEvent(ownerId: string, startsAt: Date, capacity = 5) {
  return prisma.event.create({
    data: { ownerId, title: 'Seeded event', description: '', location: 'Hall A', startsAt, capacity, status: 'PUBLISHED', publishedAt: new Date(Date.now() - DAY) },
  });
}

const holdActive = (eventId: string, participantId: string) => prisma.registration.create({ data: { eventId, participantId } });

const register = (eventId: string, cookie: string) =>
  request(app).post(`/api/events/${eventId}/registrations`).set('Cookie', cookie).send({});

const eventIdsOf = async (participantId: string) =>
  (await prisma.registration.findMany({ where: { participantId, status: 'ACTIVE' } })).map((r) => r.eventId).sort();

function expectRejected(res: request.Response, code: string) {
  expect(res.status).toBe(409);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  expect(Object.keys(error).sort()).toEqual(['code', 'message']);
}

function expectConflict(res: request.Response) {
  expectRejected(res, 'TIME_CONFLICT');
  expect(errorBody(res).message).toBe(CONFLICT_MESSAGE);
}

describe('BR-10 time conflict (CR-01)', () => {
  it('TEST-57 AC-57 rejects a registration 119 minutes after, 119 minutes before or at the same time as another', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('p1@example.com');
    const a = await seedEvent(o.id, T);
    await holdActive(a.id, p1.user.id);
    const later = await seedEvent(o.id, at(119));
    const earlier = await seedEvent(o.id, at(-119));
    const same = await seedEvent(o.id, T);

    for (const e of [later, earlier, same]) expectConflict(await register(e.id, p1.cookie));

    expect(await eventIdsOf(p1.user.id)).toEqual([a.id]);
    const detail = await request(app).get(`/api/events/${later.id}`).set('Cookie', p1.cookie);
    expect(detail.body.remainingPlaces).toBe(5);
  });

  it('TEST-58 AC-58 allows exactly 120 minutes after and before, one minute inside is still a conflict', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('p1@example.com');
    const a = await seedEvent(o.id, T);
    await holdActive(a.id, p1.user.id);
    const inside = await seedEvent(o.id, at(119));
    const after = await seedEvent(o.id, at(120));
    const before = await seedEvent(o.id, at(-120));

    expectConflict(await register(inside.id, p1.cookie));
    expect((await register(after.id, p1.cookie)).status).toBe(201);
    expect((await register(before.id, p1.cookie)).status).toBe(201);

    expect(await eventIdsOf(p1.user.id)).toEqual([a.id, after.id, before.id].sort());
  });

  it('TEST-59 AC-59 counts only the caller, counts a started registration and keeps the check order', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('p1@example.com');
    const p2 = await createUser('PARTICIPANT', 'p2@example.com');
    const p3 = await createUser('PARTICIPANT', 'p3@example.com');
    const p4 = await login('p4@example.com');
    const a = await seedEvent(o.id, T);
    await holdActive(a.id, p1.user.id);
    const d = await seedEvent(o.id, T);
    const full = await seedEvent(o.id, at(30), 2);
    await holdActive(full.id, p2.id);
    await holdActive(full.id, p3.id);
    const startedHeld = await seedEvent(o.id, new Date(Date.now() - 10 * MIN));
    await holdActive(startedHeld.id, p1.user.id);
    const started = await seedEvent(o.id, new Date(Date.now() - 30 * MIN));
    const k = await seedEvent(o.id, new Date(Date.now() + 60 * MIN));

    // (a) P1's registration at T does not count for P4.
    expect((await register(d.id, p4.cookie)).status).toBe(201);
    const before = await prisma.registration.count();

    expectRejected(await register(a.id, p1.cookie), 'ALREADY_REGISTERED'); // (b)
    expectConflict(await register(full.id, p1.cookie)); // (c) the pre-change code answers EVENT_FULL
    expectRejected(await register(started.id, p1.cookie), 'EVENT_STARTED'); // (d) started first, although it also conflicts
    expectConflict(await register(k.id, p1.cookie)); // (e) H has started, but P1's registration for it still counts

    expect(await prisma.registration.count()).toBe(before);
    expect(await eventIdsOf(p4.user.id)).toEqual([d.id]);
  });

  it('TEST-60 AC-60 lets exactly one of two parallel requests from one participant through when the events are 60 minutes apart', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('p1@example.com');
    const b = await seedEvent(o.id, T);
    const c = await seedEvent(o.id, at(60));

    const results = await Promise.all([register(b.id, p1.cookie), register(c.id, p1.cookie)]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expectConflict(results.find((r) => r.status === 409)!);
    expect(await eventIdsOf(p1.user.id)).toHaveLength(1);
  });
});
