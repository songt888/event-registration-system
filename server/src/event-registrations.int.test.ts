import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return `sid=${sidFrom(res)}`;
}

const list = (eventId: string, cookie?: string) => {
  const req = request(app).get(`/api/events/${eventId}/registrations`);
  return cookie ? req.set('Cookie', cookie) : req;
};

const event = (ownerId: string, status: 'DRAFT' | 'PUBLISHED') =>
  prisma.event.create({
    data: {
      ownerId,
      title: `${status} event`,
      description: '',
      location: 'Hall A',
      startsAt: new Date(Date.now() + 7 * DAY),
      capacity: 5,
      status,
      publishedAt: status === 'PUBLISHED' ? new Date(Date.now() - DAY) : null,
    },
  });

const registration = (eventId: string, participantId: string, minutesAgo: number) =>
  prisma.registration.create({ data: { eventId, participantId, createdAt: new Date(Date.now() - minutesAgo * 60000) } });

let f: Awaited<ReturnType<typeof fixtures>>;

// Shared fixtures of the F-05/F-06 contract (section 11): R1 < R2 < R3 < R4 by createdAt.
async function fixtures() {
  const o = await createUser('ORGANIZER', 'o@example.com');
  const o2 = await createUser('ORGANIZER', 'o2@example.com');
  const p1 = await createUser('PARTICIPANT', 'p1@example.com');
  const p2 = await createUser('PARTICIPANT', 'p2@example.com');
  const p3 = await createUser('PARTICIPANT', 'p3@example.com');
  const e = await event(o.id, 'PUBLISHED');
  const e2 = await event(o2.id, 'PUBLISHED');
  const d = await event(o.id, 'DRAFT');
  const r1 = await registration(e.id, p1.id, 40);
  const r2 = await registration(e.id, p2.id, 30);
  await registration(e2.id, p1.id, 20);
  await registration(e2.id, p3.id, 10);
  return { o, o2, e, d, r1, r2 };
}

function expectError(res: request.Response, status: number, code: string, message: string) {
  expect(res.status).toBe(status);
  expect(errorBody(res)).toEqual({ code, message });
}

beforeEach(async () => {
  f = await fixtures();
});

describe('F-06 event registrations API', () => {
  it('TEST-19 AC-19 returns an owned event registrations oldest first with participant name and email only', async () => {
    const cookie = await login('o@example.com');
    const res = await list(f.e.id, cookie);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['registrations']);
    expect(res.body.registrations).toEqual([
      { id: f.r1.id, status: 'ACTIVE', createdAt: f.r1.createdAt.toISOString(), participant: { name: 'p1', email: 'p1@example.com' } },
      { id: f.r2.id, status: 'ACTIVE', createdAt: f.r2.createdAt.toISOString(), participant: { name: 'p2', email: 'p2@example.com' } },
    ]);
    expect(res.text).not.toContain('passwordHash');

    const draft = await list(f.d.id, cookie);
    expect(draft.status).toBe(200);
    expect(draft.body).toEqual({ registrations: [] });
  });

  it('TEST-20 AC-20 returns 403 for another organizer on a PUBLISHED event', async () => {
    expectError(await list(f.e.id, await login('o2@example.com')), 403, 'FORBIDDEN', 'You do not have access to this.');
  });

  it('TEST-21 AC-21 returns 403 for a participant on any event ID', async () => {
    const cookie = await login('p1@example.com');
    for (const id of [f.e.id, f.d.id, randomUUID()])
      expectError(await list(id, cookie), 403, 'FORBIDDEN', 'You do not have access to this.');
  });

  it('TEST-47 AC-47 returns 401 for no cookie, unknown token, expired session and logged-out session', async () => {
    const expired = await insertSession(f.o.id, new Date(Date.now() - 1000));
    const cookie = await login('o@example.com');
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    for (const c of [undefined, 'sid=unknown-token', `sid=${expired}`, cookie]) {
      const res = await list(f.e.id, c);
      expect(res.status).toBe(401);
      expect(errorBody(res).code).toBe('UNAUTHENTICATED');
    }
  });

  it('TEST-48 AC-48 returns 404 for a foreign DRAFT or unknown event and 400 for a non-UUID', async () => {
    const cookie = await login('o2@example.com');
    for (const id of [f.d.id, randomUUID()]) expectError(await list(id, cookie), 404, 'EVENT_NOT_FOUND', 'Event not found.');

    const res = await list('not-a-uuid', cookie);
    expect(res.status).toBe(400);
    const error = errorBody(res);
    expect(Object.keys(error).sort()).toEqual(['code', 'details', 'message']);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details?.length).toBeGreaterThan(0);
    expect(error.details?.some((d) => d.field === 'id')).toBe(true);
    for (const d of error.details ?? []) expect(Object.keys(d).sort()).toEqual(['field', 'message']);
  });
});
