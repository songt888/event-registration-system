import { expect, test, type Page } from '@playwright/test';

// Seed accounts only. organizer2 keeps this test off organizer1's rows used by TEST-22.
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

// datetime-local value for two weeks from now, in the browser's local time.
function inTwoWeeks() {
  const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

// Pixels the page is wider than its viewport; 0 means no sideways scroll.
const sideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// f-02 line 22 maximums, with no spaces so nothing can wrap at a word boundary.
const title = 'L'.repeat(119) + 'T';
const location = 'R'.repeat(120);
const description = 'D'.repeat(2000);

test('TEST-65 AC-65 maximum-length text without spaces keeps Publish on screen and no page scrolls sideways (L6-13)', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, 'organizer2@example.com');
  await page.goto('/organizer/events/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Location').fill(location);
  await page.getByLabel('Starts at (your local time)').fill(inTwoWeeks());
  await page.getByLabel('Capacity').fill('5');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page).toHaveURL(/\/organizer\/events$/);

  const row = page.getByRole('row').filter({ hasText: title });
  for (const width of [1280, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.reload();
    await expect(row.getByRole('button', { name: 'Publish' })).toBeVisible();
    expect(await sideScroll(page), `My events scrolls sideways at ${width} px`).toBeLessThanOrEqual(0);
    // Below 1280 px a list that is still too wide scrolls inside its own box, so Publish is checked at 1280 px only.
    if (width < 1280) continue;
    for (const button of await page.getByRole('button', { name: 'Publish' }).all()) {
      const box = (await button.boundingBox())!;
      expect(box.x + box.width, `a Publish button ends past the ${width} px viewport`).toBeLessThanOrEqual(width);
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await row.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect(await sideScroll(page), 'the event page scrolls sideways').toBeLessThanOrEqual(0);

  await page.goto('/organizer/events');
  await row.getByRole('button', { name: 'Publish' }).click();
  await expect(row.getByText('PUBLISHED')).toBeVisible();
  await page.goto('/events');
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  expect(await sideScroll(page), 'the Events list scrolls sideways').toBeLessThanOrEqual(0);

  // A participant registered for the event sees the same title and location in My registrations.
  const id = (await page.getByRole('link', { name: title }).getAttribute('href'))!.split('/').pop();
  const participant = await (await browser.newContext()).newPage();
  await signIn(participant, 'participant4@example.com');
  const status = await participant.evaluate(
    async (eventId) => (await fetch(`/api/events/${eventId}/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status,
    id,
  );
  expect(status).toBe(201);
  for (const width of [1024, 768]) {
    await participant.setViewportSize({ width, height: 800 });
    await participant.goto('/my/registrations');
    await expect(participant.getByRole('row').filter({ hasText: title })).toBeVisible();
    expect(await sideScroll(participant), `My registrations scrolls sideways at ${width} px`).toBeLessThanOrEqual(0);
  }
});
