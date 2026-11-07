import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, sidFrom } from '../test/fixtures';

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function login(role: 'PARTICIPANT' | 'ORGANIZER', email: string) {
  const user = await createUser(role, email);
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { user, cookie: `sid=${sidFrom(res)}` };
}

function seedEvent(ownerId: string, data: { status?: 'DRAFT' | 'PUBLISHED'; startsAt?: Date; capacity?: number } = {}) {
  const status = data.status ?? 'PUBLISHED';
  return prisma.event.create({
    data: {
      ownerId,
      title: 'Seeded event',
      description: '',
      location: 'Hall A',
      startsAt: new Date(Date.now() + 7 * DAY),
      capacity: 5,
      status,
      publishedAt: status === 'PUBLISHED' ? new Date(Date.now() - DAY) : null,
      ...data,
    },
  });
}

const register = (eventId: string, cookie?: string) => {
  const req = request(app).post(`/api/events/${eventId}/registrations`);
  return (cookie ? req.set('Cookie', cookie) : req).send({});
};

const registrations = () => prisma.registration.findMany();

function expectError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const error = errorBody(res);
  expect(error.code).toBe(code);
  expect(Object.keys(error).sort()).toEqual(['code', 'message']);
}

async function participants(count: number) {
  const list = [];
  for (let i = 1; i <= count; i++) list.push(await login('PARTICIPANT', `p${i}@example.com`));
  return list;
}

describe('F-04 register API', () => {
  it('TEST-12 AC-12 registers a participant and lowers remainingPlaces by one', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('PARTICIPANT', 'p1@example.com');
    const e = await seedEvent(o.id, { capacity: 3 });
    const res = await register(e.id, p1.cookie);
    expect(res.status).toBe(201);
    expect(res.body.registration).toMatchObject({ eventId: e.id, status: 'ACTIVE' });
    expect(res.body.remainingPlaces).toBe(2);
    const rows = await registrations();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ eventId: e.id, participantId: p1.user.id, status: 'ACTIVE' });
    const detail = await request(app).get(`/api/events/${e.id}`).set('Cookie', p1.cookie);
    expect(detail.body.remainingPlaces).toBe(2);
  });

  it('TEST-13 AC-13 rejects registration when event is full', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const [p1, p2, p3] = await participants(3);
    const e = await seedEvent(o.id, { capacity: 2 });
    await prisma.registration.createMany({
      data: [p1, p2].map((p) => ({ eventId: e.id, participantId: p.user.id, status: 'ACTIVE' as const })),
    });
    expectError(await register(e.id, p3.cookie), 409, 'EVENT_FULL');
    expect(await registrations()).toHaveLength(2);
    expect(await prisma.registration.count({ where: { participantId: p3.user.id } })).toBe(0);
  });

  it('TEST-14 AC-14 rejects a second registration and the database refuses a second ACTIVE row', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('PARTICIPANT', 'p1@example.com');
    const e = await seedEvent(o.id);
    expect((await register(e.id, p1.cookie)).status).toBe(201);
    expectError(await register(e.id, p1.cookie), 409, 'ALREADY_REGISTERED');
    expect(await registrations()).toHaveLength(1);
    await expect(
      prisma.registration.create({ data: { eventId: e.id, participantId: p1.user.id, status: 'ACTIVE' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(await registrations()).toHaveLength(1);
  });

  it('TEST-15 AC-15 gives the last place to exactly one of several concurrent requests', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const ps = await participants(12);
    const e = await seedEvent(o.id, { capacity: 3 });
    await prisma.registration.createMany({
      data: ps.slice(0, 2).map((p) => ({ eventId: e.id, participantId: p.user.id, status: 'ACTIVE' as const })),
    });
    const results = await Promise.all(ps.slice(2).map((p) => register(e.id, p.cookie)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const rejected = results.filter((r) => r.status === 409);
    expect(rejected).toHaveLength(9);
    for (const r of rejected) expectError(r, 409, 'EVENT_FULL');
    expect(await prisma.registration.count({ where: { eventId: e.id, status: 'ACTIVE' } })).toBe(3);
  });

  it('TEST-16 AC-16 returns 403 to organizers for any event and stores nothing', async () => {
    const o = await login('ORGANIZER', 'o@example.com');
    const o2 = await login('ORGANIZER', 'o2@example.com');
    const e = await seedEvent(o.user.id);
    const d = await seedEvent(o.user.id, { status: 'DRAFT' });
    const missing = '00000000-0000-4000-8000-000000000000';
    for (const [eventId, cookie] of [
      [e.id, o.cookie],
      [e.id, o2.cookie],
      [missing, o2.cookie],
      [d.id, o.cookie],
      [d.id, o2.cookie],
    ]) {
      expectError(await register(eventId, cookie), 403, 'FORBIDDEN');
    }
    expect(await registrations()).toHaveLength(0);
  });

  it('TEST-27 AC-27 returns 404 for a DRAFT or unknown event and stores nothing', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('PARTICIPANT', 'p1@example.com');
    const d = await seedEvent(o.id, { status: 'DRAFT' });
    expectError(await register(d.id, p1.cookie), 404, 'EVENT_NOT_FOUND');
    expectError(await register('00000000-0000-4000-8000-000000000000', p1.cookie), 404, 'EVENT_NOT_FOUND');
    expect(await registrations()).toHaveLength(0);
  });

  it('TEST-28 AC-28 returns 409 EVENT_STARTED for an event that has started', async () => {
    const o = await createUser('ORGANIZER', 'o@example.com');
    const p1 = await login('PARTICIPANT', 'p1@example.com');
    const s = await seedEvent(o.id, { startsAt: new Date(Date.now() - HOUR) });
    expectError(await register(s.id, p1.cookie), 409, 'EVENT_STARTED');
    expect(await registrations()).toHaveLength(0);
  });
});
