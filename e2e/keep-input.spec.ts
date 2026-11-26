import { expect, test } from '@playwright/test';

// Seed accounts only; this test writes no data. Lab 6 enhancement #155 (L6-18 #173).
test('TEST-70 AC-70 Sign in keeps the typed password after a 400 and clears it after a 401 (L6-18)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('keep-my-typed-pw');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').getByText('Invalid email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password')).toHaveValue('keep-my-typed-pw');

  await page.getByLabel('Email').fill('participant1@example.com');
  await page.getByLabel('Password').fill('wrong-password-for-test');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel('Password')).toHaveValue('');
});

test('TEST-70 AC-70 an empty Capacity says required and sends no request (L6-18)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('organizer1@example.com');
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
  await page.goto('/organizer/events/new');

  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  await page.getByLabel('Title').fill('TEST-70 capacity check');
  await page.getByLabel('Description').fill('Capacity left empty.');
  await page.getByLabel('Location').fill('Lab 6');
  await page.getByLabel('Starts at (your local time)').fill(`${startsAt.getFullYear()}-${p(startsAt.getMonth() + 1)}-${p(startsAt.getDate())}T10:00`);

  const posts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/events') posts.push(req.url());
  });
  await page.getByRole('button', { name: 'Save draft' }).click();

  await expect(page.getByRole('alert').getByText('Capacity is required.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/organizer\/events\/new$/);
  expect(posts, 'POST /api/events requests').toEqual([]);
});
