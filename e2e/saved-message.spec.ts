import { expect, test } from '@playwright/test';

test('TEST-63 AC-63 clears the draft confirmation after publishing (L6-11)', async ({ page }) => {
  const title = 'E2E draft confirmation event';
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  await page.goto('/login');
  await page.getByLabel('Email').fill('organizer1@example.com');
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);

  await page.getByRole('link', { name: 'My events' }).click();
  await page.getByRole('link', { name: 'Create event' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill('Created for the draft confirmation check.');
  await page.getByLabel('Location').fill('Lab 6');
  await page.getByLabel('Starts at (your local time)').fill(startsAt);
  await page.getByLabel('Capacity').fill('3');
  await page.getByRole('button', { name: 'Save draft' }).click();

  const saved = page.getByText(`Draft "${title}" saved.`, { exact: true });
  const event = page.getByRole('row').filter({ hasText: title });
  await expect(saved).toBeVisible();
  await event.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(event.getByText('PUBLISHED', { exact: true })).toBeVisible();
  await expect(saved).toHaveCount(0);

  await page.reload();
  await expect(event.getByText('PUBLISHED', { exact: true })).toBeVisible();
  await expect(saved).toHaveCount(0);
});
