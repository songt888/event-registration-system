import { expect, test, type Page } from '@playwright/test';

// Seed accounts only, no registrations: organizer2 and participant4 stay off the rows TEST-22 and TEST-23 use.
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

test('TEST-66 AC-66 the event page keeps the description line breaks (L6-14)', async ({ page }) => {
  await signIn(page, 'organizer2@example.com');
  const id = await page.evaluate(async () => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Line break check',
        description: 'line one\nline two\nline three',
        location: 'Room 1',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 5,
      }),
    });
    const body = await res.json();
    return (body.event ?? body).id as string;
  });

  await page.goto(`/events/${id}`);
  const description = page.getByText('line one', { exact: false });
  await expect(description).toBeVisible();
  expect(await description.innerText()).toContain('line one\nline two\nline three');
  const lines = await description.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  expect(Math.round(lines), 'the description renders on three lines').toBe(3);
});

test('TEST-67 AC-67 at 320 px the minimized window Restore button stays inside the screen (L6-15)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await signIn(page, 'participant4@example.com');
  await page.getByRole('link', { name: 'My registrations' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My registrations' })).toBeVisible();

  await page.getByRole('button', { name: 'Minimize window' }).click();
  const restore = page.getByRole('button', { name: 'Restore window: My registrations' });
  await expect(restore).toBeVisible();
  const box = (await restore.boundingBox())!;
  expect(box.x + box.width, 'Restore button ends past the 320 px screen').toBeLessThanOrEqual(320);

  await restore.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Minimize window' })).toBeVisible();
});

test('TEST-68 AC-68 the Not found page names its window (L6-16)', async ({ page }) => {
  await signIn(page, 'participant4@example.com');

  // (a) first load of an unknown path
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Minimize window' }).click();
  await expect(page.getByRole('button', { name: /^Restore window:/ })).toHaveAccessibleName('Restore window: Not found');

  // (b) unknown path reached inside the app after Events
  await page.goto('/events');
  await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
  await page.evaluate(() => {
    history.pushState({}, '', '/no-such-page');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Minimize window' }).click();
  await expect(page.getByRole('button', { name: /^Restore window:/ })).toHaveAccessibleName('Restore window: Not found');
});
