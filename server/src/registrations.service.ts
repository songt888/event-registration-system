import { Prisma } from '@prisma/client';
import { AppError, forbidden } from './lib/errors.js';
import { prisma } from './lib/prisma.js';

const notFound = () => new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
const started = () => new AppError(409, 'EVENT_STARTED', 'This event has already started.');
const alreadyRegistered = () => new AppError(409, 'ALREADY_REGISTERED', 'You are already registered for this event.');
const full = () => new AppError(409, 'EVENT_FULL', 'This event has no places left.');

// BR-04: only a PUBLISHED event that starts strictly after now (D-12) is registrable.
export function assertRegistrable(event: { status: string; startsAt: Date }, now: Date) {
  if (event.status !== 'PUBLISHED') throw notFound();
  if (event.startsAt.getTime() <= now.getTime()) throw started();
}

type LockedEvent = { status: string; startsAt: Date; capacity: number };

// D-10: one transaction; the event row is locked first, so parallel requests for the last place run one after another.
// BR-05, D-13: a foreign DRAFT looks like a missing event; a foreign PUBLISHED event is forbidden.
export async function listEventRegistrations(organizerId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || (event.status === 'DRAFT' && event.ownerId !== organizerId)) throw notFound();
  if (event.ownerId !== organizerId) throw forbidden();

  const rows = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, status: true, createdAt: true, participant: { select: { name: true, email: true } } },
  });
  return { registrations: rows };
}

export async function registerForEvent(participantId: string, eventId: string, now: Date) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const [event] = await tx.$queryRaw<LockedEvent[]>`
          SELECT status::text AS status, "startsAt", capacity FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE`;
        if (!event) throw notFound();
        assertRegistrable(event, now);

        const where = { eventId, status: 'ACTIVE' as const };
        if (await tx.registration.findFirst({ where: { ...where, participantId } })) throw alreadyRegistered();
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
