import bcrypt from 'bcryptjs';
import { Router, type CookieOptions } from 'express';
import { z } from 'zod';
import { jsonBody } from '../lib/body.js';
import { AppError, asyncHandler, validationError, zodDetails } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { SESSION_COOKIE, requireSession } from './middleware.js';
import { createSession, deleteSession } from './session.js';

const loginSchema = z.object({ email: z.string().min(1).email(), password: z.string().min(1) }).strict();
const logoutSchema = z.object({}).strict();

// Unknown emails still run one bcrypt comparison, so both failure paths do the same work (F-01 section 2).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-unknown-email', 12);
const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw validationError(zodDetails(result.error));
  return result.data;
}

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.COOKIE_SECURE === 'true',
});

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  jsonBody,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw invalidCredentials();

    const { token, maxAgeMs } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: maxAgeMs });
    res.json({ user: { id: user.id, name: user.name, role: user.role } });
  }),
);

authRouter.get('/me', requireSession, (_req, res) => {
  res.json(res.locals.user);
});

authRouter.post(
  '/auth/logout',
  requireSession,
  jsonBody,
  asyncHandler(async (req, res) => {
    parse(logoutSchema, req.body);
    await deleteSession(res.locals.sessionId);
    res.cookie(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    res.status(204).end();
  }),
);
