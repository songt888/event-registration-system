import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type SessionUser = { id: string; name: string; role: Role };

const ttlMinutes = () => Number(process.env.SESSION_TTL_MINUTES ?? 60);

// D-08: expiry is absolute; equality counts as expired.
export const isSessionExpired = (expiresAt: Date, now: Date) => expiresAt.getTime() <= now.getTime();

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string, now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + ttlMinutes() * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), createdAt: now, expiresAt } });
  return { token, maxAgeMs: ttlMinutes() * 60 * 1000 };
}

// Returns the session's user, or null for an unknown, revoked or expired token (a found expired row is deleted).
export async function resolveSession(token: string, now = new Date()) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  if (!session) return null;
  if (isSessionExpired(session.expiresAt, now)) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return { sessionId: session.id, user: session.user as SessionUser };
}

export const deleteSession = (sessionId: string) => prisma.session.deleteMany({ where: { id: sessionId } });
