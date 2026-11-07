import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { prisma } from '../test/setup-db';

describe('F-01 seeded password storage', () => {
  it('TEST-05 AC-05 stores seeded passwords as bcrypt cost 12 hashes that verify, never as plaintext', async () => {
    const password = 'test-only-seed-password';
    execSync('npm run seed', { stdio: 'pipe', env: { ...process.env, SEED_PASSWORD: password } });

    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect(u.passwordHash).not.toBe(password);
      expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(bcrypt.getRounds(u.passwordHash)).toBe(12);
      expect(await bcrypt.compare(password, u.passwordHash)).toBe(true);
    }
  }, 60000);
});
