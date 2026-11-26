import { expect, test, type Page } from '@playwright/test';

// Seed accounts; creates one DRAFT event through the API (E2E database only). Lab 6 defect #153 (L6-17 #172).
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

test('TEST-69 AC-69 a participant sees the 403 message on Event registrations for every event ID (L6-17)', async ({ page, browser }) => {
  // A DRAFT event, created by a seed organizer in its own context.
  const org = await (await browser.newContext()).newPage();
  await signIn(org, 'organizer2@example.com');
  const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const draftId = await org.evaluate(async (startsAt) => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'TEST-69 draft', description: '', location: 'Lab 6', startsAt, capacity: 5 }),
    });
    return (await res.json()).id as string;
  }, startsAt);

  await signIn(page, 'participant1@example.com');
  const publishedId = await page.evaluate(async () => (await (await fetch('/api/events')).json()).events[0].id as string);

  // The registrations answer always comes last, so the page cannot rely on which error arrives first.
  await page.route('**/api/events/*/registrations', async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });

  for (const id of ['00000000-0000-4000-8000-000000000000', draftId, publishedId]) {
    await page.goto(`/organizer/events/${id}/registrations`);
    await expect(page.getByText('Loading...')).toHaveCount(0);
    await expect(page.getByRole('alert'), `event ${id}`).toHaveText('You do not have access to this');
    await expect(page.getByText('Not found', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
  }
});
