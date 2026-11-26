import { expect, test, type Page } from '@playwright/test';

// Seed accounts only; this test writes no data. Lab 6 enhancement #154 (L6-19).
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

test('TEST-71 AC-71 a participant on My events sees the 403 message and no Create event link (L6-19)', async ({ browser }) => {
  const participant = await (await browser.newContext()).newPage();
  await signIn(participant, 'participant4@example.com');
  await participant.goto('/organizer/events');
  await expect(participant.getByRole('alert')).toHaveText('You do not have access to this.');
  await expect(participant.getByRole('link', { name: 'Create event' })).toHaveCount(0);

  const organizer = await (await browser.newContext()).newPage();
  await signIn(organizer, 'organizer2@example.com');
  await organizer.getByRole('link', { name: 'My events' }).click();
  await expect(organizer.getByRole('link', { name: 'Create event' })).toBeVisible();
});
