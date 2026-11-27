import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { createApp } from './app';
import { prisma } from '../test/setup-db';
import { PASSWORD, createUser, errorBody, sidFrom } from '../test/fixtures';

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
