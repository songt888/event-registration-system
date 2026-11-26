import { expect, test, type Locator } from '@playwright/test';

async function expectFieldError(field: Locator, message: string) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAttribute('aria-describedby', /^\S+$/);
  await expect(field).toHaveAccessibleDescription(message);
}

test('TEST-64 AC-64 links Sign in errors to email and password (L6-12)', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').getByText('Invalid email', { exact: true })).toBeVisible();
  const required = 'String must contain at least 1 character(s)';
  await expect(page.getByRole('alert').getByText(required, { exact: true })).toBeVisible();

  await expectFieldError(page.getByLabel('Email'), 'Invalid email');
  await expectFieldError(page.getByLabel('Password'), required);
});

test('TEST-64 AC-64 marks only the invalid field on Create event (L6-12)', async ({ page }) => {
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const validFields = [
    ['Description', 'A valid description'],
    ['Location', 'Lab 6'],
    ['Starts at (your local time)', startsAt],
    ['Capacity', '3'],
  ] as const;

  await page.goto('/login');
  await page.getByLabel('Email').fill('organizer1@example.com');
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
  await page.getByRole('link', { name: 'My events' }).click();
  await page.getByRole('link', { name: 'Create event' }).click();

  for (const [label, value] of validFields) await page.getByLabel(label).fill(value);
  await page.getByRole('button', { name: 'Save draft' }).click();

  const required = 'String must contain at least 1 character(s)';
  await expect(page.getByRole('alert').getByText(required, { exact: true })).toBeVisible();
  await expectFieldError(page.getByLabel('Title'), required);
  for (const [label] of validFields) {
    const field = page.getByLabel(label);
    await expect(field).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(field).not.toHaveAttribute('aria-describedby', /.*/);
  }
});
