import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, sidFrom } from '../test/fixtures';

const app = createApp();
const hour = 60 * 60 * 1000;

async function login(role: 'ORGANIZER' | 'PARTICIPANT', email: string) {
  const user = await createUser(role, email);
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { id: user.id, cookie: `sid=${sidFrom(response)}` };
}

async function at<T>(instant: Date, send: () => PromiseLike<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    vi.setSystemTime(instant);
    return await send();
  } finally {
    vi.useRealTimers();
  }
}

const eventFields = (startsAt: Date) => ({
  title: 'Deadline fixture',
  description: '',
  location: 'Hall A',
  capacity: 3,
  startsAt: startsAt.toISOString(),
});

it.each([
  { label: 'before the start', hours: 1 },
  { label: 'equal to the start', hours: 2 },
])('TEST-81 AC-81 accepts and normalizes a zoned deadline $label', async ({ hours }) => {
  const o = await login('ORGANIZER', 'organizer@example.com');
  const now = new Date();
  const start = new Date(now.getTime() + 2 * hour);
  const relativeDeadline = new Date(now.getTime() + hours * hour);
  // Represent the same instant with an explicit non-UTC offset.
  const zoned = new Date(relativeDeadline.getTime() + 7 * hour).toISOString().replace('Z', '+07:00');
  const result = await at(now, () => request(app).post('/api/events').set('Cookie', o.cookie)
    .send({ ...eventFields(start), registrationDeadline: zoned }));
  expect(result.status).toBe(201);
  expect(result.body.registrationDeadline).toBe(relativeDeadline.toISOString());
  const stored = await prisma.event.findUniqueOrThrow({ where: { id: result.body.id } });
  expect(stored.registrationDeadline).toEqual(relativeDeadline);
});

it.each([
  { label: 'equal to now', offset: 0, code: 'INVALID_DEADLINE' },
  { label: 'earlier than now', offset: -1, code: 'INVALID_DEADLINE' },
  { label: 'later than the start', offset: 2 * hour + 1, code: 'INVALID_DEADLINE' },
  { label: 'malformed', value: 'not-a-date', code: 'VALIDATION_ERROR' },
  { label: 'missing its zone', value: '2026-12-01T17:00:00', code: 'VALIDATION_ERROR' },
])('TEST-82 AC-82 rejects a create deadline $label without writing', async ({ offset, value, code }) => {
  const o = await login('ORGANIZER', 'organizer@example.com');
  const now = new Date();
  const start = new Date(now.getTime() + 2 * hour);
  const deadline = value ?? new Date(now.getTime() + offset!).toISOString();
  const result = await at(now, () => request(app).post('/api/events').set('Cookie', o.cookie)
    .send({ ...eventFields(start), registrationDeadline: deadline }));
  expect(result.status).toBe(400);
  expect(errorBody(result).code).toBe(code);
  expect(await prisma.event.count()).toBe(0);
});

it.each([-1, 0, 1])('TEST-83 AC-83 controls registration at deadline offset %i ms', async (offset) => {
  const o = await createUser('ORGANIZER', 'organizer@example.com');
  const p = await login('PARTICIPANT', 'participant@example.com');
  const deadline = new Date();
  const e = await prisma.event.create({ data: {
    ...eventFields(new Date(deadline.getTime() + 2 * hour)),
    ownerId: o.id, status: 'PUBLISHED', registrationDeadline: deadline,
  } });
  const result = await at(new Date(deadline.getTime() + offset), () => request(app)
    .post(`/api/events/${e.id}/registrations`).set('Cookie', p.cookie).send({}));
  if (offset < 0) {
    expect(result.status).toBe(201);
    expect(await prisma.registration.count({ where: { eventId: e.id } })).toBe(1);
  } else {
    expect(result.status).toBe(409);
    expect(errorBody(result).code).toBe('REGISTRATION_CLOSED');
    expect(await prisma.registration.count({ where: { eventId: e.id } })).toBe(0);
    const detail = await request(app).get(`/api/events/${e.id}`).set('Cookie', p.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.remainingPlaces).toBe(3);
  }
});

it.each([{}, { registrationDeadline: null }])('TEST-84 AC-84 stores a null deadline when creating with %j', async (fields) => {
  const o = await login('ORGANIZER', 'organizer@example.com');
  const result = await request(app).post('/api/events').set('Cookie', o.cookie)
    .send({ ...eventFields(new Date(Date.now() + 2 * hour)), ...fields });
  expect(result.status).toBe(201);
  expect(result.body.registrationDeadline).toBeNull();
  const stored = await prisma.event.findUniqueOrThrow({ where: { id: result.body.id } });
  expect(stored.registrationDeadline).toBeNull();
});

function storedEvent(ownerId: string, start: Date, deadline: Date | null, status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' = 'PUBLISHED', capacity = 3) {
  return prisma.event.create({ data: { ...eventFields(start), ownerId, registrationDeadline: deadline, status, capacity } });
}

const patch = (id: string, cookie: string, body: object) =>
  request(app).patch(`/api/events/${id}`).set('Cookie', cookie).send(body);

const register = (id: string, cookie?: string, body: object = {}) => {
  const req = request(app).post(`/api/events/${id}/registrations`);
  return (cookie ? req.set('Cookie', cookie) : req).send(body);
};

function expectDeadlineError(result: request.Response, status: number, code: string) {
  expect(result.status).toBe(status);
  expect(errorBody(result).code).toBe(code);
  expect(typeof errorBody(result).message).toBe('string');
}

it.each([
  { label: 'equal to now', offset: 0, code: 'INVALID_DEADLINE' },
  { label: 'earlier than now', offset: -1, code: 'INVALID_DEADLINE' },
  { label: 'later than the start', offset: 2 * hour + 1, code: 'INVALID_DEADLINE' },
  { label: 'malformed', value: 'not-a-date', code: 'VALIDATION_ERROR' },
  { label: 'missing its zone', value: '2026-12-01T17:00:00', code: 'VALIDATION_ERROR' },
])('TEST-82 AC-82 rejects a PATCH deadline $label', async ({ offset, value, code }) => {
  const owner = await login('ORGANIZER', 'organizer@example.com');
  const now = new Date();
  const event = await storedEvent(owner.id, new Date(+now + 2 * hour), new Date(+now + hour));
  const result = await at(now, () => patch(event.id, owner.cookie, { registrationDeadline: value ?? new Date(+now + offset!).toISOString() }));
  expectDeadlineError(result, 400, code);
  expect(await prisma.event.findUnique({ where: { id: event.id } })).toEqual(event);
});

it.each([false, true])('TEST-84 AC-84 preserves or clears a past deadline through PATCH (clear=%s)', async (clear) => {
  const owner = await login('ORGANIZER', 'organizer@example.com');
  const now = new Date();
  const event = await storedEvent(owner.id, new Date(+now + 2 * hour), new Date(+now - 60000));
  const body = clear ? { registrationDeadline: null } : { title: 'Renamed event' };
  const result = await at(now, () => patch(event.id, owner.cookie, body));
  expect(result.status).toBe(200);
  const stored = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
  expect(stored.registrationDeadline).toEqual(clear ? null : event.registrationDeadline);
  expect(stored.title).toBe(clear ? event.title : 'Renamed event');
  if (clear) {
    const p = await login('PARTICIPANT', 'participant@example.com');
    expect((await at(now, () => register(event.id, p.cookie))).status).toBe(201);
  }
});

it.each([0, 1])('TEST-85 AC-85 moves a past deadline and checks the new boundary (%i)', async (boundary) => {
  const owner = await login('ORGANIZER', 'organizer@example.com');
  const p = await createUser('PARTICIPANT', 'participant@example.com');
  const now = new Date();
  // D-08: the default session TTL (60 min) expires exactly at the boundary register (now + 1 h), so a
  // login-session would 401 before the deadline check runs; this fixture's session outlives the boundary.
  const pCookie = `sid=${await insertSession(p.id, new Date(+now + 2 * hour))}`;
  const deadline = new Date(+now + hour);
  const event = await storedEvent(owner.id, new Date(+now + 2 * hour), new Date(+now - 60000));
  const updated = await at(now, () => patch(event.id, owner.cookie, { registrationDeadline: deadline.toISOString() }));
  expect(updated.status).toBe(200);
  expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).registrationDeadline).toEqual(deadline);
  const result = await at(new Date(+now + (boundary ? hour : hour / 2)), () => register(event.id, pCookie));
  if (boundary) expectDeadlineError(result, 409, 'REGISTRATION_CLOSED');
  else expect(result.status).toBe(201);
  expect(await prisma.registration.count()).toBe(boundary ? 0 : 1);
});

it('TEST-86 AC-86 stores equal instants for create and PATCH with different offsets', async () => {
  const owner = await login('ORGANIZER', 'organizer@example.com');
  const now = new Date();
  const deadline = new Date(+now + hour);
  const created = await at(now, () => request(app).post('/api/events').set('Cookie', owner.cookie)
    .send({ ...eventFields(new Date(+now + 2 * hour)), registrationDeadline: deadline.toISOString() }));
  expect(created.status).toBe(201);
  expect(created.body.registrationDeadline).toBe(deadline.toISOString());
  const offsetValue = new Date(+deadline + 7 * hour).toISOString().replace('Z', '+07:00');
  const updated = await at(now, () => patch(created.body.id, owner.cookie, { registrationDeadline: offsetValue }));
  expect(updated.status).toBe(200);
  expect(updated.body.registrationDeadline).toBe(deadline.toISOString());
  expect((await prisma.event.findUniqueOrThrow({ where: { id: created.body.id } })).registrationDeadline).toEqual(deadline);
});

it.each([
  ['create participant', 403, 'FORBIDDEN'],
  ['create forged owner', 400, 'VALIDATION_ERROR'],
  ['patch participant', 403, 'FORBIDDEN'],
  ['patch foreign organizer', 403, 'FORBIDDEN'],
  ['patch forged owner', 400, 'VALIDATION_ERROR'],
  ['register forged participant', 400, 'VALIDATION_ERROR'],
  ['register anonymous', 401, 'UNAUTHENTICATED'],
  ['register organizer', 403, 'FORBIDDEN'],
] as const)('TEST-87 AC-87 retains guards for %s', async (scenario, status, code) => {
  const owner = await login('ORGANIZER', 'organizer@example.com');
  const other = await login('ORGANIZER', 'other@example.com');
  const participant = await login('PARTICIPANT', 'participant@example.com');
  const now = new Date();
  const start = new Date(+now + 2 * hour);
  const deadline = new Date(+now + hour);
  const event = await storedEvent(owner.id, start, null);
  const body = { registrationDeadline: deadline.toISOString() };
  const result = await at(now, () => {
    switch (scenario) {
      case 'create participant':
      case 'create forged owner':
        return request(app).post('/api/events').set('Cookie', scenario === 'create participant' ? participant.cookie : owner.cookie)
          .send({ ...eventFields(start), ...body, ...(scenario === 'create forged owner' ? { ownerId: other.id } : {}) });
      case 'patch participant': return patch(event.id, participant.cookie, body);
      case 'patch foreign organizer': return patch(event.id, other.cookie, body);
      case 'patch forged owner': return patch(event.id, owner.cookie, { ...body, ownerId: other.id });
      case 'register forged participant': return register(event.id, participant.cookie, { participantId: other.id });
      case 'register anonymous': return register(event.id);
      case 'register organizer': return register(event.id, owner.cookie);
    }
  });
  expectDeadlineError(result, status, code);
  expect(await prisma.event.findMany()).toEqual([event]);
  expect(await prisma.registration.count()).toBe(0);
});

it.each([
  ['missing', 404, 'EVENT_NOT_FOUND'],
  ['hidden', 404, 'EVENT_NOT_FOUND'],
  ['started', 409, 'EVENT_STARTED'],
  ['closed', 409, 'EVENT_CLOSED'],
  ['deadline', 409, 'REGISTRATION_CLOSED'],
  ['duplicate', 409, 'ALREADY_REGISTERED'],
  ['conflict', 409, 'TIME_CONFLICT'],
  ['full', 409, 'EVENT_FULL'],
  ['started+deadline', 409, 'EVENT_STARTED'],
  ['closed+deadline', 409, 'EVENT_CLOSED'],
  ['deadline+duplicate', 409, 'REGISTRATION_CLOSED'],
  ['deadline+conflict', 409, 'REGISTRATION_CLOSED'],
  ['deadline+full', 409, 'REGISTRATION_CLOSED'],
  ['duplicate+conflict', 409, 'ALREADY_REGISTERED'],
] as const)('TEST-88 AC-88 applies D-35 precedence for %s', async (scenario, status, code) => {
  const owner = await createUser('ORGANIZER', 'organizer@example.com');
  const participant = await login('PARTICIPANT', 'participant@example.com');
  const now = new Date();
  const start = new Date(+now + (scenario.includes('started') ? 0 : 2 * hour));
  const deadline = scenario.includes('deadline') ? new Date(+now - 1) : null;
  const event = await storedEvent(owner.id, start, deadline, scenario.includes('closed') ? 'CLOSED' : scenario === 'hidden' ? 'DRAFT' : 'PUBLISHED', scenario.includes('full') ? 1 : 3);
  if (scenario.includes('duplicate')) {
    await prisma.registration.create({ data: { eventId: event.id, participantId: participant.id } });
  }
  if (scenario.includes('conflict')) {
    const other = await storedEvent(owner.id, new Date(+start + hour), null);
    await prisma.registration.create({ data: { eventId: other.id, participantId: participant.id } });
  }
  if (scenario.includes('full')) {
    const other = await createUser('PARTICIPANT', 'other@example.com');
    await prisma.registration.create({ data: { eventId: event.id, participantId: other.id } });
  }
  const before = await prisma.registration.findMany({ orderBy: { id: 'asc' } });
  const id = scenario === 'missing' ? '00000000-0000-4000-8000-000000000000' : event.id;
  const result = await at(now, () => register(id, participant.cookie));
  expectDeadlineError(result, status, code);
  expect(await prisma.registration.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
});
