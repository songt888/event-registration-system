import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test, type Page } from '@playwright/test';

const hour = 60 * 60 * 1000;
const deadlineLabel = /registration deadline/i;

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

function localInput(page: Page, instant: number) {
  return page.evaluate((ms) => {
    const date = new Date(ms);
    return new Date(ms - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }, instant);
}

test.use({ timezoneId: 'Asia/Bangkok' });

test('TEST-86 AC-86 displays one saved instant in two browser timezones', async ({ page, browser, baseURL }) => {
  const title = 'E2E timezone deadline ' + randomUUID();
  const deadline = Math.floor((Date.now() + 72 * hour) / 60_000) * 60_000;
  const utcInstant = new Date(deadline).toISOString();
  const firstLocal = await localInput(page, deadline);

  await signIn(page, 'organizer1@example.com');
  await page.getByRole('link', { name: 'My events' }).click();
  await page.getByRole('link', { name: 'Create event' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Location').fill('Room 301');
  await page.getByLabel('Starts at (your local time)').fill(await localInput(page, deadline + hour));
  await page.getByLabel('Capacity').fill('3');
  await page.getByLabel(deadlineLabel).fill(firstLocal);

  const create = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/events',
  );
  await page.getByRole('button', { name: 'Save draft' }).click();
  const response = await create;
  expect(response.status()).toBe(201);
  const event = await response.json();
  expect(event.registrationDeadline).toBe(utcInstant);

  const openEdit = (owner: Page) => owner.getByRole('row')
    .filter({ hasText: title }).getByText('Edit', { exact: true }).click();
  await openEdit(page);
  await expect(page.getByLabel(deadlineLabel)).toHaveValue(firstLocal);

  const secondContext = await browser.newContext({ baseURL, timezoneId: 'UTC' });
  try {
    const secondPage = await secondContext.newPage();
    await signIn(secondPage, 'organizer1@example.com');
    await secondPage.getByRole('link', { name: 'My events' }).click();
    await openEdit(secondPage);
    const secondLocal = await localInput(secondPage, deadline);
    expect(secondLocal).not.toBe(firstLocal);
    await expect(secondPage.getByLabel(deadlineLabel)).toHaveValue(secondLocal);

    const detail = await secondPage.request.get('/api/events/' + event.id);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).registrationDeadline).toBe(utcInstant);
  } finally {
    await secondContext.close();
  }
});

test('TEST-89 AC-89 saves and reloads a deadline entered in local time', async ({ page }) => {
  const title = 'E2E registration deadline ' + randomUUID();
  const first = Math.floor((Date.now() + 48 * hour) / 60_000) * 60_000;
  const updated = first + hour;

  await signIn(page, 'organizer1@example.com');
  await page.getByRole('link', { name: 'My events' }).click();
  await page.getByRole('link', { name: 'Create event' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Location').fill('Room 301');
  await page.getByLabel('Starts at (your local time)').fill(await localInput(page, first + 2 * hour));
  await page.getByLabel('Capacity').fill('3');
  await page.getByLabel(deadlineLabel).fill(await localInput(page, first));

  const create = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/events',
  );
  await page.getByRole('button', { name: 'Save draft' }).click();
  const created = await create;
  expect(created.status()).toBe(201);
  const event = await created.json();
  expect(event.registrationDeadline).toBe(new Date(first).toISOString());

  const row = page.getByRole('row').filter({ hasText: title });
  await row.getByText('Edit', { exact: true }).click();
  await expect(page.getByLabel(deadlineLabel)).toHaveValue(await localInput(page, first));
  await page.getByLabel(deadlineLabel).fill(await localInput(page, updated));

  const path = '/api/events/' + event.id;
  const patch = page.waitForResponse((response) =>
    response.request().method() === 'PATCH' && new URL(response.url()).pathname === path,
  );
  await page.getByRole('button', { name: /^Save/i }).click();
  const saved = await patch;
  expect(saved.status()).toBe(200);
  expect((await saved.json()).registrationDeadline).toBe(new Date(updated).toISOString());

  await row.getByText('Edit', { exact: true }).click();
  await page.reload();
  await expect(page.getByLabel(deadlineLabel)).toHaveValue(await localInput(page, updated));
});

test('TEST-89 AC-89 shows the local deadline and real API refusal without changing places', async ({ page }) => {
  const url = process.env.DATABASE_URL_E2E;
  if (!url || url === process.env.DATABASE_URL) throw new Error('An isolated E2E database is required');
  const prisma = new PrismaClient({ datasourceUrl: url });
  const id = randomUUID();
  const now = Date.now();
  const deadline = new Date(now - hour);

  try {
    const organizer = await prisma.user.findUniqueOrThrow({ where: { email: 'organizer1@example.com' } });
    await prisma.event.create({ data: {
      id, ownerId: organizer.id, title: 'E2E expired deadline ' + id, location: 'Room 301',
      startsAt: new Date(now + 240 * hour), capacity: 3, status: 'PUBLISHED', registrationDeadline: deadline,
    } });
    await signIn(page, 'participant4@example.com');
    await page.goto('/events/' + id);

    const initialPlaces = page.getByText('3 of 3 places left', { exact: true });
    await expect(initialPlaces).toBeVisible();
    const register = '/api/events/' + id + '/registrations';
    const refused = page.waitForResponse((response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === register,
    );
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    const response = await refused;
    expect(response.status()).toBe(409);
    const { error } = await response.json();
    expect(error.code).toBe('REGISTRATION_CLOSED');
    await expect(page.getByRole('alert')).toContainText(error.message);
    await expect(page.getByText('You are registered for this event.')).toHaveCount(0);
    await expect(initialPlaces).toBeVisible();

    const displayed = await page.evaluate((iso) => new Date(iso).toLocaleString(), deadline.toISOString());
    await expect(page.getByText(displayed, { exact: false })).toBeVisible();
  } finally {
    try {
      await prisma.$transaction([
        prisma.registration.deleteMany({ where: { eventId: id } }),
        prisma.event.deleteMany({ where: { id } }),
      ]);
    } finally {
      await prisma.$disconnect();
    }
  }
});
