import { expect, test } from '@playwright/test';

test('TEST-62 AC-62 refreshes places after a refused registration (L6-10)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('participant4@example.com');
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);

  await page.getByRole('link', { name: 'Intro to Git workshop' }).click();
  await expect(page.getByText('30 of 30 places left')).toBeVisible();
  const path = new URL(page.url()).pathname;
  const registered = await page.request.post(`/api${path}/registrations`, { data: {} });
  expect(registered.status()).toBe(201);
  await expect(page.getByText('30 of 30 places left')).toBeVisible();

  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('You are already registered for this event.');
  await expect(page.getByText('29 of 30 places left')).toBeVisible();
});
