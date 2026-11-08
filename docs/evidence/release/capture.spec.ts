import { expect, request, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Issue 10.1 (#41). Part F2 demo scenarios and the NFR-09 checklist, on the seeded E2E database.
// Writes PNGs and JSON next to this file. Seed accounts only; no cookie or password is written.
const OUT = 'docs/evidence/release';
mkdirSync(`${OUT}/demo`, { recursive: true });
mkdirSync(`${OUT}/nfr-09`, { recursive: true });

const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

async function as(browser: Browser, email: string) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email);
  return page;
}

type Call = { scenario: string; ids: string; actor: string; request: string; expected: string; status: number; body: unknown };
const calls: Call[] = [];
async function api(page: Page, scenario: string, ids: string, actor: string, method: 'GET' | 'POST', path: string, expected: string) {
  const res = method === 'GET' ? await page.request.get(path) : await page.request.post(path, { data: {} });
  const body = res.status() === 204 ? null : await res.json();
  calls.push({ scenario, ids, actor, request: `${method} ${path}`, expected, status: res.status(), body });
  return { status: res.status(), body };
}

async function eventId(page: Page, title: string) {
  const { events } = await (await page.request.get('/api/events')).json();
  return events.find((e: { title: string }) => e.title === title).id as string;
}

test.describe.serial('Part F2 demo scenarios', () => {
  const title = 'Demo: design review';

  test('Scenario 1 AC-22 AC-17 AC-19 publish, register, retrieve after reload, owner sees registrant', async ({ browser }) => {
    const org = await as(browser, 'organizer1@example.com');
    await org.getByRole('link', { name: 'My events' }).click();
    await org.getByRole('link', { name: 'Create event' }).click();
    await org.getByLabel('Title').fill(title);
    await org.getByLabel('Description').fill('Synthetic demo event.');
    await org.getByLabel('Location').fill('Room 302');
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const p2 = (n: number) => String(n).padStart(2, '0');
    await org.getByLabel('Starts at (your local time)').fill(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T14:00`);
    await org.getByLabel('Capacity').fill('3');
    await org.getByRole('button', { name: 'Save draft' }).click();
    const row = org.getByRole('row').filter({ hasText: title });
    await row.getByRole('button', { name: 'Publish' }).click();
    await expect(row.getByText('PUBLISHED')).toBeVisible();
    await shot(org, 'demo/1-1-organizer-published');

    const p = await as(browser, 'participant1@example.com');
    await p.getByRole('link', { name: title }).click();
    await p.getByRole('button', { name: 'Register' }).click();
    await expect(p.getByText('You are registered for this event.')).toBeVisible();
    await expect(p.getByText('2 of 3 places left')).toBeVisible();
    await shot(p, 'demo/1-2-participant-registered');

    await p.getByRole('link', { name: 'My registrations' }).click();
    await p.reload(); // persisted retrieval: read back from the database, not from page state
    await expect(p.getByRole('row').filter({ hasText: title })).toContainText('ACTIVE');
    await shot(p, 'demo/1-3-my-registrations-after-reload');
    const mine = await api(p, '1', 'AC-17', 'participant1', 'GET', '/api/registrations/mine', '200, includes the demo event');
    expect(mine.body.registrations.some((r: { event: { title: string } }) => r.event.title === title)).toBe(true);

    await org.reload();
    await org.getByRole('row').filter({ hasText: title }).getByRole('link', { name: 'Registrations' }).click();
    await expect(org.getByRole('row').filter({ hasText: 'participant1@example.com' })).toContainText('Participant One');
    await shot(org, 'demo/1-4-organizer-sees-registrant');
  });

  test('Scenario 2 AC-23 AC-13 AC-14 full event and duplicate are rejected, nothing stored', async ({ browser }) => {
    const career = 'Career talk (small room)'; // seed: capacity 2, participant1 already registered
    const filler = await as(browser, 'participant2@example.com');
    await filler.getByRole('link', { name: career }).click();
    await filler.getByRole('button', { name: 'Register' }).click();
    await expect(filler.getByText('You are registered for this event.')).toBeVisible();

    const p3 = await as(browser, 'participant3@example.com');
    await p3.getByRole('link', { name: career }).click();
    await p3.getByRole('button', { name: 'Register' }).click();
    await expect(p3.getByRole('alert')).toHaveText('This event has no places left.');
    await shot(p3, 'demo/2-1-full-event-rejected');
    await p3.getByRole('link', { name: 'My registrations' }).click();
    await expect(p3.getByText('You have no registrations yet.')).toBeVisible();
    await shot(p3, 'demo/2-2-my-registrations-unchanged');

    const id = await eventId(p3, career);
    expect((await api(p3, '2', 'AC-13', 'participant3', 'POST', `/api/events/${id}/registrations`, '409 EVENT_FULL')).status).toBe(409);
    expect((await api(filler, '2', 'AC-14', 'participant2', 'POST', `/api/events/${id}/registrations`, '409 ALREADY_REGISTERED')).status).toBe(409);
    const left = await (await p3.request.get(`/api/events/${id}`)).json();
    calls.push({ scenario: '2', ids: 'AC-13', actor: 'participant3', request: `GET /api/events/${id}`, expected: 'remainingPlaces 0 (never below)', status: 200, body: { remainingPlaces: left.remainingPlaces, capacity: left.capacity } });
    expect(left.remainingPlaces).toBe(0);
  });

  test('Scenario 3 AC-24 AC-04 AC-16 AC-18 AC-20 AC-21 login, logout, forbidden role and ownership', async ({ browser, baseURL }) => {
    const login = await (await browser.newContext()).newPage();
    await login.goto('/login');
    await shot(login, 'demo/3-1-login');

    const p1 = await as(browser, 'participant1@example.com');
    await expect(p1.getByText('Participant One (Participant)')).toBeVisible();
    await shot(p1, 'demo/3-2-signed-in-participant');
    const ownReg = (await (await p1.request.get('/api/registrations/mine')).json()).registrations[0].id as string;
    const career = await eventId(p1, 'Career talk (small room)');
    const robotics = await eventId(p1, 'Robotics club open day');

    // Forbidden: wrong role (AC-21), shown in the UI and by the API.
    await p1.goto(`/organizer/events/${career}/registrations`);
    await expect(p1.getByRole('alert')).toBeVisible();
    await shot(p1, 'demo/3-3-participant-forbidden');
    await api(p1, '3', 'AC-21', 'participant1', 'GET', `/api/events/${career}/registrations`, '403 FORBIDDEN');

    // Logout (AC-04, AC-24): the old cookie is rejected afterwards.
    const sid = (await p1.context().cookies()).find((c) => c.name === 'sid')!.value;
    await p1.goto('/events');
    await p1.getByRole('button', { name: 'Logout' }).click();
    await expect(p1).toHaveURL(/\/login$/);
    await p1.goto('/my/registrations');
    await expect(p1).toHaveURL(/\/login$/);
    await shot(p1, 'demo/3-4-after-logout-protected-page');
    const replay = await request.newContext({ baseURL, extraHTTPHeaders: { Cookie: `sid=${sid}` } });
    const me = await replay.get('/api/me');
    calls.push({ scenario: '3', ids: 'AC-04', actor: 'participant1 (cookie from before logout)', request: 'GET /api/me', expected: '401 UNAUTHENTICATED', status: me.status(), body: await me.json() });
    await replay.dispose();

    // Ownership: another organizer (AC-20) and another participant (AC-18); organizer cannot register (AC-16).
    const o2 = await as(browser, 'organizer2@example.com');
    await o2.goto(`/organizer/events/${career}/registrations`);
    await expect(o2.getByRole('alert')).toHaveText('You do not have access to this');
    await shot(o2, 'demo/3-5-other-organizer-forbidden');
    await api(o2, '3', 'AC-20', 'organizer2', 'GET', `/api/events/${career}/registrations`, '403 FORBIDDEN');
    await api(o2, '3', 'AC-16', 'organizer2', 'POST', `/api/events/${robotics}/registrations`, '403 FORBIDDEN');
    const p2 = await as(browser, 'participant2@example.com');
    await api(p2, '3', 'AC-18', 'participant2', 'GET', `/api/registrations/${ownReg}`, '404 NOT_FOUND');
  });

  test.afterAll(() => {
    writeFileSync(`${OUT}/demo/api-evidence.json`, JSON.stringify(calls, null, 2) + '\n');
  });
});

// NFR-09: loading, empty and error on the five S1 screens (system SDS 3.2), forced on one API call each.
type Screen = { name: string; email: string; path: (ids: Record<string, string>) => string; api: RegExp; loading: string; empty?: { key: string; text: string } };
const screens: Screen[] = [
  { name: 'events-list', email: 'participant1@example.com', path: () => '/events', api: /\/api\/events$/, loading: 'Loading events...', empty: { key: 'events', text: 'No published events yet' } },
  { name: 'event-detail', email: 'participant1@example.com', path: (i) => `/events/${i.git}`, api: /\/api\/events\/[0-9a-f-]{36}$/, loading: 'Loading event...' },
  { name: 'my-registrations', email: 'participant1@example.com', path: () => '/my/registrations', api: /\/api\/registrations\/mine$/, loading: 'Loading...', empty: { key: 'registrations', text: 'You have no registrations yet.' } },
  { name: 'my-events', email: 'organizer1@example.com', path: () => '/organizer/events', api: /\/api\/events\/mine$/, loading: 'Loading...', empty: { key: 'events', text: 'No events yet' } },
  { name: 'event-registrations', email: 'organizer1@example.com', path: (i) => `/organizer/events/${i.git}/registrations`, api: /\/api\/events\/[0-9a-f-]{36}\/registrations$/, loading: 'Loading...', empty: { key: 'registrations', text: 'No registrations yet.' } },
];
const ERROR = 'Something went wrong. Please try again.';
const results: { screen: string; state: string; expected: string; result: string; buttonsClearOfMessage: boolean }[] = [];

// True when the window buttons do not cover the message (PR #81).
async function clear(page: Page, text: string) {
  const a = await page.locator('.win-ctrl').boundingBox();
  const b = await page.getByText(text, { exact: true }).boundingBox();
  return !a || !b || a.y + a.height <= b.y || a.x + a.width <= b.x;
}

test.describe.serial('NFR-09 checklist', () => {
  const ids: Record<string, string> = {};

  for (const s of screens) {
    test(`NFR-09 ${s.name}`, async ({ browser }) => {
      const signedIn = await as(browser, s.email);
      ids.git ??= await eventId(signedIn, 'Intro to Git workshop');
      const fresh = () => signedIn.context().newPage(); // one page per state, same session

      let page = await fresh();
      await page.route(s.api, () => new Promise<void>(() => {})); // never answered: the screen stays loading
      await page.goto(s.path(ids));
      await expect(page.getByText(s.loading, { exact: true })).toBeVisible();
      await shot(page, `nfr-09/${s.name}-loading`);
      results.push({ screen: s.name, state: 'loading', expected: s.loading, result: 'pass', buttonsClearOfMessage: await clear(page, s.loading) });
      await page.close();

      if (s.empty) {
        const empty = s.empty;
        page = await fresh();
        await page.route(s.api, async (route) => {
          const json = await (await route.fetch()).json();
          await route.fulfill({ json: { ...json, [empty.key]: [] } });
        });
        await page.goto(s.path(ids));
        await expect(page.getByText(empty.text, { exact: true })).toBeVisible();
        await shot(page, `nfr-09/${s.name}-empty`);
        results.push({ screen: s.name, state: 'empty', expected: empty.text, result: 'pass', buttonsClearOfMessage: await clear(page, empty.text) });
        await page.close();
      }

      page = await fresh();
      await page.route(s.api, (route) => route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: ERROR } } }));
      await page.goto(s.path(ids));
      await expect(page.getByRole('alert')).toHaveText(ERROR);
      if (s.name === 'my-events') await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      await shot(page, `nfr-09/${s.name}-error`);
      results.push({ screen: s.name, state: 'error', expected: `alert "${ERROR}"`, result: 'pass', buttonsClearOfMessage: await clear(page, ERROR) });
    });
  }

  test.afterAll(() => {
    writeFileSync(`${OUT}/nfr-09/results.json`, JSON.stringify(results, null, 2) + '\n');
  });
});
