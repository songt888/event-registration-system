import { expect, test } from '@playwright/test';

// UI-only coverage with a mocked list response: the seed always has PUBLISHED events. TEST-10 covers the real API.
test('TEST-11 AC-11 Events screen shows the empty state for an empty list', async ({ page }) => {
  await page.route('**/api/events', (route) => route.fulfill({ json: { events: [] } }));
  await page.goto('/login');
  await page.getByLabel('Email').fill('participant1@example.com');
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByText('No published events yet')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(0);
});
