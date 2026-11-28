import type { Event, Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError, forbidden, validationError, zodDetails } from './lib/errors.js';

type Db = Pick<PrismaClient, 'event'>;

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().max(2000),
    location: z.string().trim().min(1).max(120),
    startsAt: z.string().datetime({ offset: true }).transform((s) => new Date(s)),
    // F-09, D-35: omitted or null stores no deadline (the old open-until-start rule).
    registrationDeadline: z
      .string()
      .datetime({ offset: true })
      .transform((s) => new Date(s))
      .nullish(),
    capacity: z.number().int().min(1).max(10000),
  })
  .strict();

export type CreateEventInput = z.infer<typeof createSchema>;

const editSchema = createSchema.partial().refine((b) => Object.keys(b).length > 0, 'At least one field is required');

export type EditEventInput = z.infer<typeof editSchema>;

const invalidStart = () => new AppError(400, 'INVALID_START_TIME', 'The start time must be in the future.');
const invalidDeadline = () =>
  new AppError(400, 'INVALID_DEADLINE', 'Registration deadline must be after now and no later than the event start time.');
const notFound = () => new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
const alreadyPublished = () => new AppError(409, 'ALREADY_PUBLISHED', 'This event is already published.');
const conflict = (code: string, message: string) => () => new AppError(409, code, message);
const started = conflict('EVENT_STARTED', 'This event has already started.');
const notEditable = conflict('EVENT_NOT_EDITABLE', 'This event can no longer be edited.');
const hasRegistrations = conflict('EVENT_HAS_REGISTRATIONS', 'The start time cannot change while people are registered.');
const capacityBelowActive = conflict('CAPACITY_BELOW_ACTIVE', 'Capacity cannot be lower than the number of registered participants.');
const notPublished = conflict('EVENT_NOT_PUBLISHED', 'Only a published event can be closed.');
const alreadyClosed = conflict('ALREADY_CLOSED', 'This event is already closed.');
const alreadyCancelled = conflict('ALREADY_CANCELLED', 'This event is already cancelled.');

const hidden = (status: string) => status === 'DRAFT' || status === 'CANCELLED';

// remainingPlaces is derived from ACTIVE registrations on every read, never stored.
const withActiveCount = { _count: { select: { registrations: { where: { status: 'ACTIVE' as const } } } } };

function toPayload(e: Event & { _count: { registrations: number } }) {
  const { id, title, description, location, startsAt, capacity, status, registrationDeadline } = e;
  return {
    id,
    title,
    description,
    location,
    startsAt,
    capacity,
    registrationDeadline,
    remainingPlaces: capacity - e._count.registrations,
    status,
  };
}

export function parseCreateEvent(body: unknown): CreateEventInput {
  const result = createSchema.safeParse(body);
  if (!result.success) throw validationError(zodDetails(result.error));
  return result.data;
}

export async function createEvent(db: Db, ownerId: string, input: CreateEventInput, now: Date) {
  if (input.startsAt <= now) throw invalidStart();
  // F-09, D-35: a non-null deadline must satisfy now < deadline <= startsAt (BR-06).
  const registrationDeadline = input.registrationDeadline ?? null;
  if (registrationDeadline && (registrationDeadline <= now || registrationDeadline > input.startsAt)) throw invalidDeadline();
  return toPayload(await db.event.create({ data: { ...input, ownerId, registrationDeadline }, include: withActiveCount }));
}

export function parseEditEvent(body: unknown): EditEventInput {
  const result = editSchema.safeParse(body);
  if (!result.success) throw validationError(zodDetails(result.error));
  return result.data;
}

export async function listPublishedEvents(db: Db) {
  return listEvents(db, { status: { in: ['PUBLISHED', 'CLOSED'] } });
}

export async function listMyEvents(db: Db, ownerId: string) {
  return listEvents(db, { ownerId });
}

async function listEvents(db: Db, where: Prisma.EventWhereInput) {
  const events = await db.event.findMany({
    where,
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    include: withActiveCount,
  });
  return events.map(toPayload);
}

// D-13: a DRAFT or CANCELLED event is visible only to its owner; to anyone else it is indistinguishable from a missing event.
export async function getEvent(db: Db, callerId: string, eventId: string) {
  const e = await db.event.findUnique({ where: { id: eventId }, include: withActiveCount });
  if (!e || (hidden(e.status) && e.ownerId !== callerId)) throw notFound();
  return toPayload(e);
}

type LockedEvent = { ownerId: string; status: string; startsAt: Date; registrationDeadline: Date | null };
type Tx = Prisma.TransactionClient;

// D-10: every F-08 change locks the event row first, so it runs one after another with registrations (AC-92, AC-101).
function manage<T>(db: PrismaClient, callerId: string, eventId: string, fn: (tx: Tx, e: LockedEvent) => Promise<T>) {
  return db.$transaction(
    async (tx) => {
      const [e] = await tx.$queryRaw<LockedEvent[]>`
        SELECT "ownerId"::text AS "ownerId", status::text AS status, "startsAt", "registrationDeadline"
        FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE`;
      if (!e || (hidden(e.status) && e.ownerId !== callerId)) throw notFound();
      if (e.ownerId !== callerId) throw forbidden();
      return fn(tx, e);
    },
    { maxWait: 15000, timeout: 15000 },
  );
}

const save = async (tx: Tx, id: string, data: Prisma.EventUpdateInput) =>
  toPayload(await tx.event.update({ where: { id }, data, include: withActiveCount }));

export function editEvent(db: PrismaClient, callerId: string, eventId: string, input: EditEventInput, now: Date) {
  return manage(db, callerId, eventId, async (tx, e) => {
    if (e.startsAt <= now) throw started();
    if (e.status === 'CLOSED' || e.status === 'CANCELLED') throw notEditable();
    const active = await tx.registration.count({ where: { eventId, status: 'ACTIVE' } });
    const { startsAt } = input;
    if (startsAt && startsAt.getTime() !== e.startsAt.getTime()) {
      if (active > 0) throw hasRegistrations();
      if (startsAt <= now) throw invalidStart();
      // F-08 step 8: the stored-deadline check applies only to a PATCH that moves the start WITHOUT
      // sending a deadline; a sent deadline is validated against the new start by the F-09 block below.
      if (e.registrationDeadline && input.registrationDeadline === undefined && e.registrationDeadline > startsAt) {
        throw invalidDeadline();
      }
    }
    if (input.capacity !== undefined && input.capacity < active) throw capacityBelowActive();
    // F-09, D-35: only a PATCH that sends the deadline validates it (now < deadline <= the effective start,
    // the changed start when both change). An omitted deadline preserves the stored value; null clears it.
    const effectiveStart = startsAt ?? e.startsAt;
    if (input.registrationDeadline && (input.registrationDeadline <= now || input.registrationDeadline > effectiveStart)) {
      throw invalidDeadline();
    }
    return save(tx, eventId, input);
  });
}

export function closeEvent(db: PrismaClient, callerId: string, eventId: string) {
  return manage(db, callerId, eventId, async (tx, e) => {
    if (e.status === 'CLOSED') throw alreadyClosed();
    if (e.status !== 'PUBLISHED') throw notPublished();
    return save(tx, eventId, { status: 'CLOSED' });
  });
}

// D-34: no time limit; the ACTIVE registrations are cancelled in the same transaction.
export function cancelEvent(db: PrismaClient, callerId: string, eventId: string, now: Date) {
  return manage(db, callerId, eventId, async (tx, e) => {
    if (e.status === 'CANCELLED') throw alreadyCancelled();
    await tx.registration.updateMany({ where: { eventId, status: 'ACTIVE' }, data: { status: 'CANCELLED', cancelledAt: now } });
    return save(tx, eventId, { status: 'CANCELLED' });
  });
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
