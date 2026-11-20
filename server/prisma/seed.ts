// Repeatable synthetic seed (system SDS 2.3) for local, test and E2E databases: it empties every table first.
// Never run it on the deployed database; releases use seed-demo.ts (L5-02, D-20).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createMissingDemoData } from './demo-data.js';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error('SEED_PASSWORD is not set (see .env.example)');
  const passwordHash = await bcrypt.hash(password, 12); // NFR-02: cost >= 10, configured 12 (system SDS 6)

  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await createMissingDemoData(prisma, passwordHash);

  console.log('Seed done: 2 organizers, 4 participants, 4 events, 1 registration.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
