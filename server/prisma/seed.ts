// Repeatable synthetic seed (system SDS 2.3). Dates are relative to now, so seeded events stay registrable (D-14).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY);

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error('SEED_PASSWORD is not set (see .env.example)');
  const passwordHash = await bcrypt.hash(password, 10); // NFR-02: cost >= 10

  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const user = (email: string, name: string, role: 'ORGANIZER' | 'PARTICIPANT') =>
    prisma.user.create({ data: { email, name, role, passwordHash } });

  const org1 = await user('organizer1@example.com', 'Organizer One', 'ORGANIZER');
  const org2 = await user('organizer2@example.com', 'Organizer Two', 'ORGANIZER');
  const p1 = await user('participant1@example.com', 'Participant One', 'PARTICIPANT');
  for (const n of [2, 3, 4]) await user(`participant${n}@example.com`, `Participant ${n}`, 'PARTICIPANT');

  const published = { status: 'PUBLISHED' as const, publishedAt: new Date() };
  await prisma.event.create({
    data: { ownerId: org1.id, title: 'Intro to Git workshop', description: 'Hands-on Git basics.', location: 'Room 201', startsAt: inDays(7), capacity: 30, ...published },
  });
  const almostFull = await prisma.event.create({
    data: { ownerId: org1.id, title: 'Career talk (small room)', description: 'Two places only.', location: 'Room 105', startsAt: inDays(10), capacity: 2, ...published },
  });
  await prisma.registration.create({ data: { eventId: almostFull.id, participantId: p1.id } });
  await prisma.event.create({
    data: { ownerId: org1.id, title: 'Hackathon planning (draft)', location: 'Lab 3', startsAt: inDays(21), capacity: 50 },
  });
  await prisma.event.create({
    data: { ownerId: org2.id, title: 'Robotics club open day', description: 'Meet the robotics club.', location: 'Engineering hall', startsAt: inDays(14), capacity: 40, ...published },
  });

  console.log('Seed done: 2 organizers, 4 participants, 4 events, 1 registration.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
