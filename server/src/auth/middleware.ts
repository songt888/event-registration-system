import type { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { asyncHandler, forbidden, unauthenticated } from '../lib/errors.js';
import { resolveSession } from './session.js';

export const SESSION_COOKIE = 'sid';

function readCookie(header: string | undefined, name: string) {
  for (const part of header?.split(';') ?? []) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('='); // base64url tokens never need decoding
  }
  return undefined;
}

// NFR-01: identity comes only from the session cookie, never from the request body or headers.
export const requireSession: RequestHandler = asyncHandler(async (req, res, next) => {
  const token = readCookie(req.headers.cookie, SESSION_COOKIE);
  const found = token ? await resolveSession(token) : null;
  if (!found) throw unauthenticated();
  res.locals.user = found.user;
  res.locals.sessionId = found.sessionId;
  next();
});

// D-13: runs after requireSession and before any target lookup, so a wrong role gets 403 for every ID.
export const requireRole =
  (role: Role): RequestHandler =>
  (_req, res, next) => {
    next(res.locals.user?.role === role ? undefined : forbidden());
  };
