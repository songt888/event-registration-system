import { expect, test, type Browser, type Page } from '@playwright/test';

// F-08 (S2-04, #203): TEST-105 to TEST-107 from docs/sprints/sprint-2/f-08-manage-event.md section 11.
const DAY = 24 * 60 * 60 * 1000;

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

async function createPublished(page: Page, title: string, days: number) {
  const created = await page.request.post('/api/events', {
    data: { title, description: 'Created for the F-08 E2E tests.', location: 'Room 301', startsAt: new Date(Date.now() + days * DAY).toISOString(), capacity: 5 },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  expect((await page.request.post(`/api/events/${id}/publish`, { data: {} })).status()).toBe(200);
  return id as string;
}

async function registerAs(browser: Browser, email: string, eventId: string) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email);
  expect((await page.request.post(`/api/events/${eventId}/registrations`, { data: {} })).status()).toBe(201);
  await page.context().close();
}

test('TEST-105 AC-105 edits a seeded event from My events and keeps the new values after a reload', async ({ page }) => {
  await signIn(page, 'organizer1@example.com');
  await page.getByRole('link', { name: 'My events' }).click();
  await page.getByRole('row').filter({ hasText: 'Hackathon planning (draft)' }).getByText('Edit', { exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/[^/]+\/edit$/);
  await expect(page.getByLabel('Title')).toHaveValue('Hackathon planning (draft)');
  await page.getByLabel('Title').fill('Hackathon planning (edited)');
  await page.getByLabel('Capacity').fill('40');
  await page.getByRole('button', { name: /^Save/ }).click();
  await expect(page).toHaveURL(/\/organizer\/events$/);

  await page.reload();
  const row = page.getByRole('row').filter({ hasText: 'Hackathon planning (edited)' });
  await expect(row).toBeVisible();
  await expect(row.getByText('40 of 40')).toBeVisible();
});

test('TEST-106 AC-106 closes one event and cancels another from My events', async ({ page, browser }) => {
  const closedTitle = 'E2E event to close';
  const cancelledTitle = 'E2E event to cancel';
  await signIn(page, 'organizer1@example.com');
  await createPublished(page, closedTitle, 30);
  await createPublished(page, cancelledTitle, 31);

  await page.getByRole('link', { name: 'My events' }).click();
  const closedRow = page.getByRole('row').filter({ hasText: closedTitle });
  const cancelledRow = page.getByRole('row').filter({ hasText: cancelledTitle });
  await closedRow.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(closedRow.getByText('CLOSED', { exact: true })).toBeVisible();
  await cancelledRow.getByRole('button', { name: 'Cancel event', exact: true }).click();
  await cancelledRow.getByRole('button', { name: 'Confirm cancel', exact: true }).click();
  await expect(cancelledRow.getByText('CANCELLED', { exact: true })).toBeVisible();

  const participant = await (await browser.newContext()).newPage();
  await signIn(participant, 'participant3@example.com');
  await expect(participant.getByRole('link', { name: cancelledTitle })).toHaveCount(0);
  await participant.getByRole('link', { name: closedTitle }).click();
  await expect(participant.getByText('This event is closed.')).toBeVisible();
  await expect(participant.getByRole('button', { name: 'Register' })).toHaveCount(0);
});

test('TEST-107 AC-107 shows the capacity floor message and keeps the typed values', async ({ page, browser }) => {
  const title = 'E2E capacity floor event';
  await signIn(page, 'organizer1@example.com');
  const id = await createPublished(page, title, 40);
  for (const email of ['participant3@example.com', 'participant4@example.com']) await registerAs(browser, email, id);

  await page.getByRole('link', { name: 'My events' }).click();
  await page.getByRole('row').filter({ hasText: title }).getByText('Edit', { exact: true }).click();
  await expect(page.getByLabel('Title')).toHaveValue(title);
  await page.getByLabel('Capacity').fill('1');
  await page.getByRole('button', { name: /^Save/ }).click();

  await expect(page.getByRole('alert')).toHaveText('Capacity cannot be lower than the number of registered participants.');
  await expect(page.getByLabel('Capacity')).toHaveValue('1');
  await expect(page.getByLabel('Title')).toHaveValue(title);
  await expect(page.getByLabel('Location')).toHaveValue('Room 301');
  await expect(page.getByLabel('Description')).toHaveValue('Created for the F-08 E2E tests.');
});
