import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { prisma } from '../test/setup-db';

const password = 'test-only-demo-seed-password';
const seedDemo = () => execSync('npm run seed:demo', { stdio: 'pipe', env: { ...process.env, SEED_PASSWORD: password } });
const DEMO_EMAILS = ['organizer1', 'organizer2', 'participant1', 'participant2', 'participant3', 'participant4'].map((n) => `${n}@example.com`);

// L5-02 (D-20): releases run this seed; it must never delete or change existing data (Lab 5 R-04).
describe('L5-02 non-destructive demo seed', () => {
  it('TEST-53 AC-53 creates missing demo data once and leaves existing rows untouched on a second run', async () => {
    seedDemo();
    const demoUsers = await prisma.user.findMany({ where: { email: { in: DEMO_EMAILS } }, orderBy: { email: 'asc' } });
    expect(demoUsers.map((u) => u.email)).toEqual([...DEMO_EMAILS].sort());
    expect(await prisma.event.count()).toBe(4);
    for (const u of demoUsers) {
      expect(bcrypt.getRounds(u.passwordHash)).toBe(12);
      expect(await bcrypt.compare(password, u.passwordHash)).toBe(true);
    }

    const p2 = demoUsers.find((u) => u.email === 'participant2@example.com')!;
    const git = await prisma.event.findFirstOrThrow({ where: { title: 'Intro to Git workshop' } });
    const reg = await prisma.registration.create({ data: { eventId: git.id, participantId: p2.id } });
    const other = await prisma.user.create({
      data: { email: 'real.user@example.com', name: 'Real User', role: 'PARTICIPANT', passwordHash: 'not-a-demo-hash' },
    });

    seedDemo();
    const after = await prisma.user.findMany({ where: { email: { in: DEMO_EMAILS } }, orderBy: { email: 'asc' } });
    expect(after.map((u) => [u.id, u.passwordHash])).toEqual(demoUsers.map((u) => [u.id, u.passwordHash]));
    expect(await prisma.event.count()).toBe(4);
    expect(await prisma.registration.findUnique({ where: { id: reg.id } })).toEqual(reg);
    expect(await prisma.user.findUnique({ where: { id: other.id } })).toEqual(other);
  }, 60000);
});
