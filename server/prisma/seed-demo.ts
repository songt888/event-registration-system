// Non-destructive demo seed for the deployed database (L5-02, D-20): adds missing demo accounts and events only.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createMissingDemoData } from './demo-data.js';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error('SEED_PASSWORD is not set (see .env.example)');
  await createMissingDemoData(prisma, await bcrypt.hash(password, 12)); // NFR-02: bcrypt cost 12
  console.log('Demo seed done: missing demo data created, nothing deleted or changed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
