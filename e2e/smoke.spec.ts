import { expect, test } from '@playwright/test';

// Foundation smoke test: the UI loads, asks the API for the session through the dev proxy,
// and sends a signed-out visitor to the login form. The journeys TEST-22..TEST-24 come in Issue 9.
test('signed-out visitor is sent to the login form', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
});
