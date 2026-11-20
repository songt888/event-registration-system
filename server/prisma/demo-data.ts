// Demo accounts and events shared by both seeds (system SDS 2.3). It only creates what is missing and never
// deletes or updates a row, so releases can run it on live data (L5-02, D-20). Dates are relative to now (D-14).
import type { PrismaClient } from '@prisma/client';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY);

export async function createMissingDemoData(prisma: PrismaClient, passwordHash: string) {
  const user = async (email: string, name: string, role: 'ORGANIZER' | 'PARTICIPANT') =>
    (await prisma.user.findUnique({ where: { email } })) ?? prisma.user.create({ data: { email, name, role, passwordHash } });

  const org1 = await user('organizer1@example.com', 'Organizer One', 'ORGANIZER');
  const org2 = await user('organizer2@example.com', 'Organizer Two', 'ORGANIZER');
  const p1 = await user('participant1@example.com', 'Participant One', 'PARTICIPANT');
  for (const n of [2, 3, 4]) await user(`participant${n}@example.com`, `Participant ${n}`, 'PARTICIPANT');

  // An event counts as present when its owner already has one with the same title; returns null if it existed.
  const event = async (data: { ownerId: string; title: string; description?: string; location: string; startsAt: Date; capacity: number; status?: 'PUBLISHED'; publishedAt?: Date }) =>
    (await prisma.event.findFirst({ where: { ownerId: data.ownerId, title: data.title } })) ? null : prisma.event.create({ data });

  const published = { status: 'PUBLISHED' as const, publishedAt: new Date() };
  await event({ ownerId: org1.id, title: 'Intro to Git workshop', description: 'Hands-on Git basics.', location: 'Room 201', startsAt: inDays(7), capacity: 30, ...published });
  const almostFull = await event({ ownerId: org1.id, title: 'Career talk (small room)', description: 'Two places only.', location: 'Room 105', startsAt: inDays(10), capacity: 2, ...published });
  if (almostFull) await prisma.registration.create({ data: { eventId: almostFull.id, participantId: p1.id } });
  await event({ ownerId: org1.id, title: 'Hackathon planning (draft)', location: 'Lab 3', startsAt: inDays(21), capacity: 50 });
  await event({ ownerId: org2.id, title: 'Robotics club open day', description: 'Meet the robotics club.', location: 'Engineering hall', startsAt: inDays(14), capacity: 40, ...published });
}
