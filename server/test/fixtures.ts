import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Response } from 'supertest';
import { prisma } from './setup-db';

export const PASSWORD = 'test-password-1';

// Low bcrypt cost keeps fixtures fast; TEST-05 checks the real seed cost.
export async function createUser(role: 'PARTICIPANT' | 'ORGANIZER', email: string, name = email.split('@')[0]) {
  return prisma.user.create({ data: { email, name, role, passwordHash: await bcrypt.hash(PASSWORD, 4) } });
}

export const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

// Inserts a Session row directly (D-08 fixtures) and returns its plaintext token.
export async function insertSession(userId: string, expiresAt: Date) {
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  return token;
}

export function setCookies(res: Response): string[] {
  const raw = res.headers['set-cookie'] as unknown;
  return Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
}

export function sidFrom(res: Response): string | undefined {
  const c = setCookies(res).find((v) => v.startsWith('sid='));
  return c ? c.slice(4, c.indexOf(';') === -1 ? undefined : c.indexOf(';')) : undefined;
}

// Asserts the shared error envelope (system SDS 4.2) and returns it.
export function errorBody(res: Response) {
  const body = res.body as { error?: Record<string, unknown> };
  if (!body || Object.keys(body).join() !== 'error' || !body.error) throw new Error(`not an error envelope: ${res.text}`);
  if ('stack' in body.error) throw new Error('error contains a stack');
  if (typeof body.error.message !== 'string' || body.error.message === '') throw new Error('error.message missing');
  return body.error as { code: string; message: string; details?: { field: string; message: string }[] };
}
