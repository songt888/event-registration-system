import { expect, test } from '@playwright/test';

// Seed accounts only; this test writes no data. Lab 6 enhancement #151 (L6-20 #177).
const SIZES = [[320, 568], [375, 667], [768, 1024], [812, 375]] as const;
const ROLES = [
  { email: 'organizer1@example.com', path: '/organizer/events/new' },
  { email: 'participant1@example.com', path: '/events' },
];

test('TEST-72 AC-72 the taskbar never covers the page, and from 641 px it keeps Logout on one row (L6-20)', async ({ browser }) => {
  for (const { email, path } of ROLES) {
    for (const [width, height] of SIZES) {
      const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/\/events$/);
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      if (path === '/events') await expect(page.getByRole('link', { name: 'Intro to Git workshop' })).toBeVisible();
      // The taskbar can grow after first paint (web font, role links), so scroll to the end and measure until it settles.
      const measure = () =>
        page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          const header = document.querySelector('header')!.getBoundingClientRect();
          const shown = [...document.querySelectorAll('main *')].filter((e) => e.getClientRects().length);
          const pageBottom = Math.max(...shown.map((e) => e.getBoundingClientRect().bottom));
          const top = (name: string) => [...document.querySelectorAll('header a, header button')].find((e) => e.textContent?.trim() === name)!.getBoundingClientRect().top;
          return { headerTop: header.top, pageBottom, logoutTop: top('Logout'), eventsTop: top('Events') };
        });
      let m = await measure();
      for (let i = 0; i < 30 && m.pageBottom > m.headerTop; i++) {
        await page.waitForTimeout(100);
        m = await measure();
      }
      const at = `${email.split('@')[0]} at ${width}x${height}`;
      // (a) after scrolling to the end, the lowest content of the page (for the organizer: Save draft) is above the taskbar
      expect.soft(m.pageBottom, `${at}: page bottom vs taskbar top ${m.headerTop}`).toBeLessThanOrEqual(m.headerTop);
      // (b) above the 640 px layout the taskbar is a single row: Logout sits on the same row as Events
      if (width > 640) expect.soft(Math.abs(m.logoutTop - m.eventsTop), `${at}: Logout row vs Events row`).toBeLessThanOrEqual(8);
      await page.context().close();
    }
  }
});
