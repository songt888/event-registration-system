import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';

// F-10 (S3-02, #207): TEST-119 from docs/sprints/sprint-3/f-10-checkin.md section 11.
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

async function createPublished(page: Page, title: string, startsInMs: number) {
  const created = await page.request.post('/api/events', {
    data: { title, description: 'Created for the F-10 E2E test.', location: 'Room 301', startsAt: new Date(Date.now() + startsInMs).toISOString(), capacity: 5 },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  expect((await page.request.post(`/api/events/${id}/publish`, { data: {} })).status()).toBe(200);
  return id as string;
}

async function registerAs(browser: Browser, email: string, eventIds: string[]) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email);
  for (const id of eventIds) expect((await page.request.post(`/api/events/${id}/registrations`, { data: {} })).status()).toBe(201);
  await page.context().close();
}

test('TEST-119 AC-119 checks in from Event registrations inside the window and shows the window message outside it', async ({ page, browser }) => {
  await signIn(page, 'organizer1@example.com');
  const soon = await createPublished(page, 'E2E check-in soon ' + randomUUID(), 30 * MIN);
  const later = await createPublished(page, 'E2E check-in later ' + randomUUID(), 7 * DAY);
  await registerAs(browser, 'participant2@example.com', [soon, later]);

  await page.goto(`/organizer/events/${soon}/registrations`);
  const row = page.getByRole('row').filter({ hasText: 'participant2@example.com' });
  await row.getByRole('button', { name: 'Check in' }).click();
  await expect(row.getByText('Checked in')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: 'participant2@example.com' }).getByText('Checked in')).toBeVisible();

  await page.goto(`/organizer/events/${later}/registrations`);
  const laterRow = page.getByRole('row').filter({ hasText: 'participant2@example.com' });
  await laterRow.getByRole('button', { name: 'Check in' }).click();
  await expect(page.getByRole('alert')).toContainText('Check-in is open from 60 minutes before the start until 6 hours after it.');
  await expect(laterRow.getByRole('button', { name: 'Check in' })).toBeVisible();
});
