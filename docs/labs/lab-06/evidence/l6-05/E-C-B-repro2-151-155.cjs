// Reproduce Est findings #151-#155 on local 04e8590 (dev servers, seeded DB).
const path = require('path');
const WT = process.argv[2];
const OUT = process.argv[3];
const { chromium } = require(path.join(WT, 'node_modules', '@playwright/test'));
const B = 'http://localhost:5173';
const PW = 'change-me';
const log = (...a) => console.log(...a);

async function signIn(p, email) {
  await p.goto(B + '/login');
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Password').fill(PW);
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.waitForURL(/\/events$/);
}
async function page(b, w, h) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  return c.newPage();
}
const rect = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; });

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });

  // #151 taskbar size and overlap
  for (const [w, h, url, target] of [
    [320, 568, '/organizer/events/new', 'Save draft'],
    [320, 568, '/organizer/events', null],
    [768, 1024, '/events', null],
    [812, 375, '/events', null],
  ]) {
    const p = await page(b, w, h);
    await signIn(p, 'organizer1@example.com');
    await p.goto(B + url);
    await p.locator('main h1').first().waitFor();
    await p.waitForTimeout(400);
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(300);
    const bar = await rect(p.locator('header').first());
    const lastInMain = await p.evaluate(() => { const els = [...document.querySelectorAll('main *')].filter((e) => e.getClientRects().length); const r = Math.max(...els.map((e) => e.getBoundingClientRect().bottom)); return Math.round(r); });
    let t = '';
    if (target) { const r = await rect(p.getByRole('button', { name: target })); t = ` ${target} top=${r.top} bottom=${r.bottom} covered=${Math.max(0, r.bottom - bar.top)}px`; }
    const logoutRow = await p.getByRole('button', { name: 'Logout' }).evaluate((e) => Math.round(e.getBoundingClientRect().top));
    const firstNavTop = await p.locator('header nav').first().evaluate((e) => Math.round(e.getBoundingClientRect().top));
    log(`#151 ${w}x${h} ${url}: taskbar top=${bar.top} height=${bar.h}; lowest main content bottom=${lastInMain}; Logout top=${logoutRow} nav top=${firstNavTop}${t}`);
    await p.screenshot({ path: `${OUT}/R151-${w}x${h}-${url.replace(/\//g, '_')}.png` });
    await p.context().close();
  }

  // #152 Save draft / Publish after logout in another tab
  {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const a = await c.newPage();
    await signIn(a, 'organizer1@example.com');
    await a.goto(B + '/organizer/events/new');
    await a.getByLabel('Title').fill('UAT-CHECK-401-ONLY');
    await a.getByLabel('Location').fill('Room 1');
    await a.getByLabel('Starts at (your local time)').fill('2027-01-10T10:00');
    await a.getByLabel('Capacity').fill('5');
    const tabB = await c.newPage();
    await tabB.goto(B + '/events');
    await tabB.getByRole('button', { name: 'Logout' }).click();
    await tabB.waitForURL(/\/login$/);
    await a.getByRole('button', { name: 'Save draft' }).click();
    await a.waitForTimeout(1500);
    log(`#152 Save draft after logout in tab B: url=${new URL(a.url()).pathname}, alerts=${JSON.stringify(await a.getByRole('alert').allInnerTexts())}`);
    await a.screenshot({ path: `${OUT}/R152-save-draft.png` });
    await c.close();
    // Publish path
    const c2 = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const a2 = await c2.newPage();
    await signIn(a2, 'organizer1@example.com');
    await a2.goto(B + '/organizer/events');
    await a2.getByRole('button', { name: 'Publish' }).first().waitFor();
    const b2 = await c2.newPage();
    await b2.goto(B + '/events');
    await b2.getByRole('button', { name: 'Logout' }).click();
    await b2.waitForURL(/\/login$/);
    await a2.getByRole('button', { name: 'Publish' }).first().click();
    await a2.waitForTimeout(1500);
    log(`#152 Publish after logout in tab B: url=${new URL(a2.url()).pathname}, alerts=${JSON.stringify(await a2.getByRole('alert').allInnerTexts())}`);
    await a2.screenshot({ path: `${OUT}/R152-publish.png` });
    await c2.close();
  }

  // #153 participant on an organizer registrations URL, 10 loads
  {
    const p = await page(b, 1280, 800);
    await signIn(p, 'participant3@example.com');
    const counts = {};
    for (let i = 0; i < 10; i++) {
      await p.goto(B + '/organizer/events/00000000-0000-0000-0000-000000000000/registrations');
      await p.waitForFunction(() => /You do not have access to this|Not found/.test(document.querySelector('main')?.innerText || ''));
      const t = (await p.locator('main').innerText()).match(/You do not have access to this|Not found/)[0];
      counts[t] = (counts[t] || 0) + 1;
    }
    log(`#153 10 loads of /organizer/events/<zero uuid>/registrations as Participant 3: ${JSON.stringify(counts)}`);
    await p.context().close();
  }

  // #154 participant opens My events
  {
    const p = await page(b, 1280, 800);
    await signIn(p, 'participant3@example.com');
    await p.goto(B + '/organizer/events');
    await p.getByText('You do not have access to this').waitFor();
    log(`#154 /organizer/events as Participant 3: Create event link visible=${await p.getByRole('link', { name: 'Create event' }).isVisible()}, message="${(await p.getByRole('alert').allInnerTexts()).join(' | ')}"`);
    await p.screenshot({ path: `${OUT}/R154-participant-my-events.png` });
    await p.context().close();
  }

  // #155 password cleared on 400; blank capacity message
  {
    const p = await page(b, 1280, 800);
    await p.goto(B + '/login');
    await p.getByLabel('Email').fill('not-an-email');
    await p.getByLabel('Password').fill('keep-my-typed-pw');
    const resp = p.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 5000 }).catch(() => null);
    await p.getByRole('button', { name: 'Sign in' }).click();
    const r = await resp;
    await p.waitForTimeout(800);
    log(`#155 login not-an-email: request sent=${!!r}${r ? ' status=' + r.status() : ''}, email="${await p.getByLabel('Email').inputValue()}", password empty=${(await p.getByLabel('Password').inputValue()) === ''}, alerts=${JSON.stringify(await p.getByRole('alert').allInnerTexts())}`);
    await p.screenshot({ path: `${OUT}/R155-login-400.png` });
    await signIn(p, 'organizer1@example.com');
    await p.goto(B + '/organizer/events/new');
    await p.getByRole('button', { name: 'Save draft' }).click();
    await p.waitForTimeout(1000);
    log(`#155 blank Create event: alerts=${JSON.stringify(await p.getByRole('alert').allInnerTexts())}`);
    await p.screenshot({ path: `${OUT}/R155-blank-capacity.png` });
    await p.context().close();
  }

  await b.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
