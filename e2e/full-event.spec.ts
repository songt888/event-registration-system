import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

// Seed: "Career talk (small room)" has capacity 2 and one ACTIVE registration (participant1).
test('TEST-23 AC-23 full event shows the full message and My registrations stays unchanged', async ({ browser }) => {
  const title = 'Career talk (small room)';

  const filler = await (await browser.newContext()).newPage();
  await signIn(filler, 'participant2@example.com');
  await filler.getByRole('link', { name: title }).click();
  await filler.getByRole('button', { name: 'Register' }).click();
  await expect(filler.getByText('You are registered for this event.')).toBeVisible();
  await expect(filler.getByText('Full', { exact: true })).toBeVisible();

  const page = await (await browser.newContext()).newPage();
  await signIn(page, 'participant3@example.com');
  await page.getByRole('link', { name: title }).click();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('alert')).toHaveText('This event has no places left.');

  await page.getByRole('link', { name: 'My registrations' }).click();
  await expect(page.getByText('You have no registrations yet.')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(0);
});
