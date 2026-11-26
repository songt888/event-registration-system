import { expect, test } from '@playwright/test';

// Seed accounts only; this test writes no data. Lab 6 defect #142 (L6-09).
test('TEST-56 AC-56 after logout in another tab, protected navigation shows Sign in and stops the refused requests (L6-09)', async ({ context }) => {
  const tab1 = await context.newPage();
  await tab1.goto('/login');
  await tab1.getByLabel('Email').fill('participant1@example.com');
  await tab1.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await tab1.getByRole('button', { name: 'Sign in' }).click();
  await expect(tab1).toHaveURL(/\/events$/);

  // Same browser context, so the second tab shares the session cookie.
  const tab2 = await context.newPage();
  await tab2.goto('/events');
  await expect(tab2.getByText('Participant One (Participant)')).toBeVisible();
  await tab2.getByRole('button', { name: 'Logout' }).click();
  await expect(tab2).toHaveURL(/\/login$/);

  // Tab 1 still shows the old user. On the unfixed client the click loops between /login and /events and
  // repeats GET /api/events (401) about 16 times per second, so Sign in never stays.
  await tab1.getByRole('link', { name: 'My registrations' }).click();
  await expect(tab1.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Count refused requests only from here: the dev-mode client (React StrictMode) sends each first request twice.
  const refused: string[] = [];
  tab1.on('response', (res) => {
    if (res.status() === 401 && new URL(res.url()).pathname.startsWith('/api/')) refused.push(new URL(res.url()).pathname);
  });
  await tab1.waitForTimeout(3000);
  await expect(tab1).toHaveURL(/\/login$/);
  await expect(tab1.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(tab1.getByText('Participant One (Participant)')).toHaveCount(0);
  expect(refused, 'requests refused with 401 after Sign in appeared').toEqual([]);
});
