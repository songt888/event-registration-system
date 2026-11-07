import { expect, test } from '@playwright/test';

// Foundation smoke test (Issue 3.3): the UI loads and reaches the API through the dev proxy.
// The journeys TEST-22..TEST-24 come in Issue 9.
test('home page shows the API as ok', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Event Registration' })).toBeVisible();
  await expect(page.getByText('API: ok')).toBeVisible();
});
