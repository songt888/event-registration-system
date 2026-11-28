import { Prisma } from '@prisma/client';
import { AppError, forbidden } from './lib/errors.js';
import { prisma } from './lib/prisma.js';

const notFound = () => new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
const registrationNotFound = () => new AppError(404, 'NOT_FOUND', 'Registration not found.');
const started = () => new AppError(409, 'EVENT_STARTED', 'This event has already started.');
const registrationClosed = () => new AppError(409, 'REGISTRATION_CLOSED', 'Registration for this event is closed.');
const alreadyRegistered = () => new AppError(409, 'ALREADY_REGISTERED', 'You are already registered for this event.');
const full = () => new AppError(409, 'EVENT_FULL', 'This event has no places left.');
const notActive = () => new AppError(409, 'REGISTRATION_NOT_ACTIVE', 'Only an active registration can be checked in.');
const alreadyCheckedIn = () => new AppError(409, 'ALREADY_CHECKED_IN', 'This participant is already checked in.');
const outsideWindow = () => new AppError(409, 'OUTSIDE_CHECKIN_WINDOW', 'Check-in is open from 60 minutes before the start until 6 hours after it.');

// BR-04, D-35 order: 404 hidden -> EVENT_STARTED -> EVENT_CLOSED -> REGISTRATION_CLOSED -> duplicate -> conflict -> full.
export function assertRegistrable(
  event: { status: string; startsAt: Date; registrationDeadline?: Date | null },
  now: Date,
) {
  if (event.status !== 'PUBLISHED' && event.status !== 'CLOSED') throw notFound();
  if (event.startsAt.getTime() <= now.getTime()) throw started();
  if (event.status === 'CLOSED') throw new AppError(409, 'EVENT_CLOSED', 'This event is closed.');
  // At equality the deadline closes registration (BR-06); D-35 puts it after the closed check.
  if (event.registrationDeadline && event.registrationDeadline.getTime() <= now.getTime()) throw registrationClosed();
}

type LockedEvent = { status: string; startsAt: Date; registrationDeadline: Date | null; capacity: number };

// BR-05, D-13: a foreign DRAFT or CANCELLED event looks like a missing event; a foreign PUBLISHED or CLOSED event is forbidden.
export async function listEventRegistrations(organizerId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || ((event.status === 'DRAFT' || event.status === 'CANCELLED') && event.ownerId !== organizerId)) throw notFound();
  if (event.ownerId !== organizerId) throw forbidden();

  const rows = await prisma.registration.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, select: rosterSelect });
  return { registrations: rows.map(rosterItem) };
}

// F-06 roster item; F-10 adds checkedInAt (null without a check-in), after createdAt.
const rosterSelect = {
  id: true,
  status: true,
  createdAt: true,
  checkIn: { select: { checkedInAt: true } },
  participant: { select: { name: true, email: true } },
} as const;

type RosterRow = { id: string; status: string; createdAt: Date; checkIn: { checkedInAt: Date } | null; participant: { name: string; email: string } };
const rosterItem = ({ id, status, createdAt, checkIn, participant }: RosterRow) => ({ id, status, createdAt, checkedInAt: checkIn?.checkedInAt ?? null, participant });

// D-10: one transaction; the event row is locked first, so parallel requests for the last place run one after another.
export async function registerForEvent(participantId: string, eventId: string, now: Date) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const [event] = await tx.$queryRaw<LockedEvent[]>`
          SELECT status::text AS status, "startsAt", "registrationDeadline", capacity FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE`;
        if (!event) throw notFound();
        assertRegistrable(event, now);

        const where = { eventId, status: 'ACTIVE' as const };
        if (await tx.registration.findFirst({ where: { ...where, participantId } })) throw alreadyRegistered();

        // BR-10: serialize one participant's registration attempts across different events.
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${participantId}::uuid FOR UPDATE`;
        const conflictWindowMs = 120 * 60 * 1000;
        const startMs = event.startsAt.getTime();
        const conflict = await tx.registration.findFirst({
          where: {
            participantId,
            status: 'ACTIVE',
            eventId: { not: eventId },
            event: {
              startsAt: { gt: new Date(startMs - conflictWindowMs), lt: new Date(startMs + conflictWindowMs) },
            },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new AppError(409, 'TIME_CONFLICT', 'You are already registered for another event that starts within 2 hours of this one.');
        }

        const active = await tx.registration.count({ where });
        if (active >= event.capacity) throw full();

        const r = await tx.registration.create({ data: { eventId, participantId } });
        return {
          registration: { id: r.id, eventId: r.eventId, status: r.status, createdAt: r.createdAt },
          remainingPlaces: event.capacity - active - 1,
        };
      },
      // Requests queue on the row lock and on the connection pool; the defaults (2 s / 5 s) are too short for NFR-04's burst.
      { maxWait: 15000, timeout: 15000 },
    );
  } catch (err) {
    // Backstop only: the partial unique index (D-02) rejected a second ACTIVE row.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw alreadyRegistered();
    throw err;
  }
}

// F-05 (BR-05): a participant reads only rows where participantId is the session user.
const mineSelect = {
  id: true,
  status: true,
  createdAt: true,
  cancelledAt: true,
  event: { select: { id: true, title: true, location: true, startsAt: true } },
} as const;

export function listMyRegistrations(participantId: string) {
  return prisma.registration.findMany({ where: { participantId }, select: mineSelect, orderBy: { createdAt: 'desc' } });
}

// Unknown ID and another participant's row give the same 404 (D-13).
export async function getMyRegistration(participantId: string, id: string) {
  const r = await prisma.registration.findFirst({ where: { id, participantId }, select: mineSelect });
  if (!r) throw registrationNotFound();
  return r;
}

export function cancelRegistration(participantId: string, id: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    // D-10: serialize with registration and event cancellation on the same event.
    const [event] = await tx.$queryRaw<{ startsAt: Date }[]>`
      SELECT e."startsAt" FROM "Event" e
      JOIN "Registration" r ON r."eventId" = e.id
      WHERE r.id = ${id}::uuid AND r."participantId" = ${participantId}::uuid
      FOR UPDATE OF e`;
    if (!event) throw registrationNotFound();

    const registration = await tx.registration.findFirst({ where: { id, participantId }, select: { status: true } });
    if (!registration) throw registrationNotFound();
    if (registration.status === 'CANCELLED') {
      throw new AppError(409, 'ALREADY_CANCELLED', 'This registration has already been cancelled.');
    }
    if (event.startsAt.getTime() <= now.getTime()) throw started();
    // D-36 (F-10): a checked-in registration cannot be cancelled; checked after ALREADY_CANCELLED and EVENT_STARTED.
    if (await tx.checkIn.findUnique({ where: { registrationId: id }, select: { id: true } })) {
      throw new AppError(409, 'ALREADY_CHECKED_IN', 'A checked-in registration cannot be cancelled.');
    }

    return tx.registration.update({
      where: { id, participantId },
      data: { status: 'CANCELLED', cancelledAt: now },
      select: { ...mineSelect, cancelledAt: true },
    });
  }, { maxWait: 15000, timeout: 15000 });
}

const CHECKIN_OPENS_MS = 60 * 60 * 1000;
const CHECKIN_CLOSES_MS = 6 * 60 * 60 * 1000;

// F-10 (D-36): the event owner checks in an ACTIVE registration once, while startsAt - 60 min <= now < startsAt + 6 h.
// Order: 404 unknown registration, event row lock (D-10), 403 another organizer's event, REGISTRATION_NOT_ACTIVE,
// ALREADY_CHECKED_IN, OUTSIDE_CHECKIN_WINDOW. The unique registrationId is the backstop for parallel requests.
export async function checkInRegistration(organizerId: string, id: string, now: Date) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const found = await tx.registration.findUnique({ where: { id }, select: { eventId: true } });
        if (!found) throw registrationNotFound();
        const [event] = await tx.$queryRaw<{ ownerId: string; startsAt: Date }[]>`
          SELECT "ownerId"::text AS "ownerId", "startsAt" FROM "Event" WHERE id = ${found.eventId}::uuid FOR UPDATE`;
        if (event.ownerId !== organizerId) throw forbidden();

        const registration = await tx.registration.findUniqueOrThrow({ where: { id }, select: { status: true, checkIn: { select: { id: true } } } });
        if (registration.status !== 'ACTIVE') throw notActive();
        if (registration.checkIn) throw alreadyCheckedIn();
        const start = event.startsAt.getTime();
        if (now.getTime() < start - CHECKIN_OPENS_MS || now.getTime() >= start + CHECKIN_CLOSES_MS) throw outsideWindow();

        await tx.checkIn.create({ data: { registrationId: id, checkedInAt: now, checkedInById: organizerId } });
        return { registration: rosterItem(await tx.registration.findUniqueOrThrow({ where: { id }, select: rosterSelect })) };
      },
      { maxWait: 15000, timeout: 15000 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw alreadyCheckedIn();
    throw err;
  }
}
