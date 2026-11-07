import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../../test/setup-db';
import { PASSWORD, createUser, errorBody, insertSession, setCookies, sha256, sidFrom } from '../../test/fixtures';

const login = (app: ReturnType<typeof createApp>, email: string, password = PASSWORD) =>
  request(app).post('/api/auth/login').send({ email, password });

afterEach(() => {
  delete process.env.COOKIE_SECURE;
});

describe('F-01 authentication API', () => {
  it('TEST-01 AC-01 logs in either role, sets the sid cookie and stores only the token hash with 60-minute expiry', async () => {
    const p = await createUser('PARTICIPANT', 'p1@example.com', 'Participant One');
    const o = await createUser('ORGANIZER', 'o1@example.com', 'Organizer One');
    const app = createApp();

    for (const user of [p, o]) {
      const res = await login(app, user.email.toUpperCase());
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { id: user.id, name: user.name, role: user.role } });
      expect(res.text).not.toMatch(/passwordHash|tokenHash|email/);

      const cookie = setCookies(res).find((c) => c.startsWith('sid='))!;
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Max-Age=3600/);
      expect(cookie).not.toMatch(/Secure/i);

      const token = sidFrom(res)!;
      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
      const session = await prisma.session.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
      expect(session.userId).toBe(user.id);
      expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(60 * 60 * 1000);
      expect(JSON.stringify(session)).not.toContain(token);
    }

    process.env.COOKIE_SECURE = 'true';
    const secure = await login(createApp(), p.email);
    expect(setCookies(secure).find((c) => c.startsWith('sid='))).toMatch(/Secure/i);
  });

  it('TEST-02 AC-02 returns the same 401 INVALID_CREDENTIALS for a wrong password and an unknown email, creating no session', async () => {
    await createUser('PARTICIPANT', 'p1@example.com');
    const app = createApp();

    const wrong = await login(app, 'p1@example.com', 'not-the-password');
    const unknown = await login(app, 'nobody@example.com');
    for (const res of [wrong, unknown]) {
      expect(res.status).toBe(401);
      expect(errorBody(res)).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
      expect(sidFrom(res)).toBeUndefined();
    }
    expect(await prisma.session.count()).toBe(0);
  });

  it('TEST-03 AC-03 rejects GET /api/me without a cookie with 401 UNAUTHENTICATED and no private data', async () => {
    const res = await request(createApp()).get('/api/me');
    expect(res.status).toBe(401);
    expect(Object.keys(errorBody(res))).toEqual(['code', 'message']);
    expect(errorBody(res).code).toBe('UNAUTHENTICATED');
  });

  it('TEST-04 AC-04 logout deletes only the current session, clears the cookie, and the old cookie is rejected', async () => {
    const user = await createUser('PARTICIPANT', 'p1@example.com');
    const app = createApp();
    const a = sidFrom(await login(app, user.email))!;
    const b = sidFrom(await login(app, user.email))!;

    const out = await request(app).post('/api/auth/logout').set('Cookie', `sid=${a}`).send({});
    expect(out.status).toBe(204);
    expect(out.text).toBe('');
    const cleared = setCookies(out).find((c) => c.startsWith('sid='))!;
    expect(cleared).toMatch(/Max-Age=0/);
    expect(cleared).toMatch(/Path=\//);
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(a) } })).toBeNull();

    const replay = await request(app).get('/api/me').set('Cookie', `sid=${a}`);
    expect(replay.status).toBe(401);
    expect(errorBody(replay).code).toBe('UNAUTHENTICATED');
    expect((await request(app).get('/api/me').set('Cookie', `sid=${b}`)).status).toBe(200);
  });

  it('TEST-04 AC-04 logout with a valid session but an invalid body returns 400 and keeps the session', async () => {
    const user = await createUser('PARTICIPANT', 'p1@example.com');
    const app = createApp();
    const sid = sidFrom(await login(app, user.email))!;
    const cookie = `sid=${sid}`;

    const cases = [
      request(app).post('/api/auth/logout').set('Cookie', cookie).set('Content-Type', 'application/json').send('{bad'),
      request(app).post('/api/auth/logout').set('Cookie', cookie).send([]),
      request(app).post('/api/auth/logout').set('Cookie', cookie).send({ extra: 1 }),
      request(app).post('/api/auth/logout').set('Cookie', cookie).set('Content-Type', 'text/plain').send('{}'),
    ];
    for (const res of await Promise.all(cases)) {
      expect(res.status).toBe(400);
      expect(errorBody(res).code).toBe('VALIDATION_ERROR');
      expect(sidFrom(res)).toBeUndefined();
    }
    expect(await prisma.session.count()).toBe(1);
    expect((await request(app).get('/api/me').set('Cookie', cookie)).status).toBe(200);
  });

  it('TEST-39 AC-39 GET /api/me returns exactly the caller id, name and role for either role', async () => {
    const p = await createUser('PARTICIPANT', 'p1@example.com', 'Participant One');
    const o = await createUser('ORGANIZER', 'o1@example.com', 'Organizer One');
    const app = createApp();

    for (const user of [p, o]) {
      const sid = sidFrom(await login(app, user.email))!;
      const res = await request(app).get('/api/me').set('Cookie', `sid=${sid}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: user.id, name: user.name, role: user.role });
    }
  });

  it('TEST-40 AC-40 rejects unknown and expired sessions, deletes the expired row, and does not extend a valid session', async () => {
    const user = await createUser('PARTICIPANT', 'p1@example.com');
    const other = await createUser('PARTICIPANT', 'p2@example.com');
    const app = createApp();
    const expired = await insertSession(user.id, new Date(Date.now() - 1000));
    const future = new Date(Date.now() + 30 * 60 * 1000);
    const valid = await insertSession(user.id, future);
    const otherValid = await insertSession(other.id, future);

    for (const sid of ['unknown-token', '%E0', expired]) {
      const res = await request(app).get('/api/me').set('Cookie', `sid=${sid}`);
      expect(res.status).toBe(401);
      expect(errorBody(res).code).toBe('UNAUTHENTICATED');
    }
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(expired) } })).toBeNull();

    expect((await request(app).get('/api/me').set('Cookie', `sid=${valid}`)).status).toBe(200);
    const after = await prisma.session.findUniqueOrThrow({ where: { tokenHash: sha256(valid) } });
    expect(after.expiresAt.getTime()).toBe(future.getTime());

    // Logout without a valid session: 401 before body validation; other sessions untouched.
    const expired2 = await insertSession(user.id, new Date(Date.now() - 1000));
    const logoutCases = [
      request(app).post('/api/auth/logout').send({}),
      request(app).post('/api/auth/logout').set('Cookie', 'sid=unknown-token').send({ extra: 1 }),
      request(app).post('/api/auth/logout').set('Cookie', `sid=${expired2}`).set('Content-Type', 'text/plain').send('x'),
      request(app).post('/api/auth/logout').set('Cookie', `sid=${expired}`).send({}),
    ];
    for (const res of await Promise.all(logoutCases)) {
      expect(res.status).toBe(401);
      expect(errorBody(res).code).toBe('UNAUTHENTICATED');
    }
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(otherValid) } })).not.toBeNull();
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(valid) } })).not.toBeNull();
  });

  it('TEST-41 AC-41 rejects invalid login requests with 400 VALIDATION_ERROR and creates no session', async () => {
    await createUser('PARTICIPANT', 'p1@example.com');
    const app = createApp();
    const post = () => request(app).post('/api/auth/login');
    const json = (body: unknown) => post().send(body as object);

    const fieldCases: [unknown, string][] = [
      [{ password: PASSWORD }, 'email'],
      [{ email: 'p1@example.com' }, 'password'],
      [{ email: '', password: PASSWORD }, 'email'],
      [{ email: 'not-an-email', password: PASSWORD }, 'email'],
      [{ email: 42, password: PASSWORD }, 'email'],
      [{ email: 'p1@example.com', password: '' }, 'password'],
      [{ email: 'p1@example.com', password: 123 }, 'password'],
      [{ email: 'p1@example.com', password: PASSWORD, userId: '00000000-0000-4000-8000-000000000000' }, 'userId'],
      [{ email: 'p1@example.com', password: PASSWORD, role: 'ORGANIZER' }, 'role'],
    ];
    for (const [body, field] of fieldCases) {
      const res = await json(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      const err = errorBody(res);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details?.some((d) => d.field === field)).toBe(true);
      expect(res.text).not.toContain(PASSWORD);
    }

    const shapeCases = [
      json([]),
      post().set('Content-Type', 'application/json').send('null'),
      post().set('Content-Type', 'application/json').send('{bad json'),
      post().set('Content-Type', 'text/plain').send(`email=p1@example.com&password=${PASSWORD}`),
    ];
    for (const res of await Promise.all(shapeCases)) {
      expect(res.status).toBe(400);
      expect(errorBody(res).code).toBe('VALIDATION_ERROR');
      expect(res.text).not.toContain(PASSWORD);
    }
    expect(await prisma.session.count()).toBe(0);
  });
});
