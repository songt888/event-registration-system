import type { Event, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError, forbidden, validationError, zodDetails } from './lib/errors.js';

type Db = Pick<PrismaClient, 'event'>;

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().max(2000),
    location: z.string().trim().min(1).max(120),
    startsAt: z.string().datetime({ offset: true }).transform((s) => new Date(s)),
    capacity: z.number().int().min(1).max(10000),
  })
  .strict();

export type CreateEventInput = z.infer<typeof createSchema>;

const invalidStart = () => new AppError(400, 'INVALID_START_TIME', 'The start time must be in the future.');
const notFound = () => new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
const alreadyPublished = () => new AppError(409, 'ALREADY_PUBLISHED', 'This event is already published.');

// remainingPlaces is derived from ACTIVE registrations on every read, never stored.
const withActiveCount = { _count: { select: { registrations: { where: { status: 'ACTIVE' as const } } } } };

function toPayload(e: Event & { _count: { registrations: number } }) {
  const { id, title, description, location, startsAt, capacity, status } = e;
  return { id, title, description, location, startsAt, capacity, remainingPlaces: capacity - e._count.registrations, status };
}

export function parseCreateEvent(body: unknown): CreateEventInput {
  const result = createSchema.safeParse(body);
  if (!result.success) throw validationError(zodDetails(result.error));
  return result.data;
}

export async function createEvent(db: Db, ownerId: string, input: CreateEventInput, now: Date) {
  if (input.startsAt <= now) throw invalidStart();
  return toPayload(await db.event.create({ data: { ...input, ownerId }, include: withActiveCount }));
}

export async function listMyEvents(db: Db, ownerId: string) {
  const events = await db.event.findMany({
    where: { ownerId },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    include: withActiveCount,
  });
  return events.map(toPayload);
}

// D-13: a DRAFT is visible only to its owner; to anyone else it is indistinguishable from a missing event.
export async function getEvent(db: Db, callerId: string, eventId: string) {
  const e = await db.event.findUnique({ where: { id: eventId }, include: withActiveCount });
  if (!e || (e.status === 'DRAFT' && e.ownerId !== callerId)) throw notFound();
  return toPayload(e);
}

// Ownership is checked before state and time; the conditional update keeps publication atomic.
export async function publishEvent(db: Db, callerId: string, eventId: string, now: Date) {
  const e = await db.event.findUnique({ where: { id: eventId } });
  if (!e || (e.status === 'DRAFT' && e.ownerId !== callerId)) throw notFound();
  if (e.ownerId !== callerId) throw forbidden();
  if (e.status === 'PUBLISHED') throw alreadyPublished();
  if (e.startsAt <= now) throw invalidStart();
  const { count } = await db.event.updateMany({
    where: { id: eventId, ownerId: callerId, status: 'DRAFT' },
    data: { status: 'PUBLISHED', publishedAt: now },
  });
  if (count === 0) throw alreadyPublished();
  return getEvent(db, callerId, eventId);
}
