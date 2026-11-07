import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach } from 'vitest';
import { testDatabaseUrl } from './test-db';

// Every Prisma client created by app code in this process uses the test database.
process.env.DATABASE_URL = testDatabaseUrl();

export const prisma = new PrismaClient();

// D-14: every table is emptied before each test.
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "Registration", "Event", "Session", "User" CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
