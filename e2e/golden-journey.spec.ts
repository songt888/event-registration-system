import { expect, test, type Page } from '@playwright/test';

// Seed accounts only. TEST-23 uses participant2/3 on "Career talk", so these tests stay off both.
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

// datetime-local value for a week from now, in the browser's local time.
function nextWeek() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

test('TEST-22 AC-22 organizer publishes, participant registers and sees it, owner sees the registrant', async ({ browser }) => {
  const title = 'E2E golden journey event';

  const org = await (await browser.newContext()).newPage();
  await signIn(org, 'organizer1@example.com');
  await org.getByRole('link', { name: 'My events' }).click();
  await org.getByRole('link', { name: 'Create event' }).click();
  await org.getByLabel('Title').fill(title);
  await org.getByLabel('Description').fill('Created by the E2E journey.');
  await org.getByLabel('Location').fill('Room 301');
  await org.getByLabel('Starts at (your local time)').fill(nextWeek());
  await org.getByLabel('Capacity').fill('3');
  await org.getByRole('button', { name: 'Save draft' }).click();
  await expect(org.getByText(`Draft "${title}" saved.`)).toBeVisible();
  const row = org.getByRole('row').filter({ hasText: title });
  await row.getByRole('button', { name: 'Publish' }).click();
  await expect(row.getByText('PUBLISHED')).toBeVisible();

  const p = await (await browser.newContext()).newPage();
  await signIn(p, 'participant1@example.com');
  await p.getByRole('link', { name: title }).click();
  await expect(p.getByText('3 of 3 places left')).toBeVisible();
  await p.getByRole('button', { name: 'Register' }).click();
  await expect(p.getByText('You are registered for this event.')).toBeVisible();
  await expect(p.getByText('2 of 3 places left')).toBeVisible();
  await p.getByRole('link', { name: 'My registrations' }).click();
  await expect(p.getByRole('row').filter({ hasText: title })).toContainText('ACTIVE');

  await org.reload();
  await org.getByRole('row').filter({ hasText: title }).getByRole('link', { name: 'Registrations' }).click();
  await expect(org.getByRole('heading', { name: `${title}: 1 registrations` })).toBeVisible();
  await expect(org.getByRole('row').filter({ hasText: 'participant1@example.com' })).toContainText('Participant One');
});

test('TEST-24 AC-24 header shows name and role for each role; after logout a protected page opens login', async ({ page }) => {
  for (const [email, header] of [
    ['participant1@example.com', 'Participant One (Participant)'],
    ['organizer1@example.com', 'Organizer One (Organizer)'],
  ]) {
    await signIn(page, email);
    await expect(page.getByText(header)).toBeVisible();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/my/registrations');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  }
});
