import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

test('TEST-80 AC-80 cancels an active registration and shows a refused cancellation', async ({ page }) => {
  // Use the same isolated DB as the E2E server, never the development DB.
  const url = process.env.DATABASE_URL_E2E;
  if (!url || url === process.env.DATABASE_URL) throw new Error('An isolated E2E database is required');
  const prisma = new PrismaClient({ datasourceUrl: url });
  const email = 'participant4@example.com';
  const id = randomUUID();
  const fixtures = [
    { title: 'E2E active cancellation ' + id, startsAt: new Date(Date.now() + 86400000), status: 'ACTIVE' },
    { title: 'E2E already cancelled ' + id, startsAt: new Date(Date.now() + 172800000), status: 'CANCELLED' },
    { title: 'E2E started cancellation refusal ' + id, startsAt: new Date(Date.now() - 86400000), status: 'ACTIVE' },
  ] as const;

  try {
    const [active, cancelled, started] = await prisma.$transaction(async (tx) => {
      const organizer = await tx.user.findUniqueOrThrow({ where: { email: 'organizer1@example.com' } });
      const participant = await tx.user.findUniqueOrThrow({ where: { email } });
      return Promise.all(fixtures.map(async ({ title, startsAt, status }) => {
        const event = await tx.event.create({
          data: { ownerId: organizer.id, title, startsAt, location: 'Room 301', capacity: 3, status: 'PUBLISHED' },
        });
        const registration = await tx.registration.create({
          data: { eventId: event.id, participantId: participant.id, status, cancelledAt: status === 'CANCELLED' ? new Date() : null },
        });
        return { title, id: registration.id };
      }));
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await page.getByRole('link', { name: 'My registrations' }).click();
    await expect(page).toHaveURL(/\/my\/registrations$/);

    const row = (title: string) => page.getByRole('row').filter({ hasText: title });
    const control = (title: string) => row(title).getByRole('button', { name: /^cancel/i });
    const path = (registrationId: string) => '/api/registrations/' + registrationId + '/cancel';

    await expect(row(cancelled.title).getByText('CANCELLED', { exact: true })).toBeVisible();
    await expect(control(cancelled.title)).toHaveCount(0);
    await expect(row(active.title).getByText('ACTIVE', { exact: true })).toBeVisible();
    await expect(control(active.title)).toBeEnabled();

    // Hold only this real request so the pending state can be observed reliably.
    let release = () => {};
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**' + path(active.id), async (route) => {
      await pending;
      await route.continue();
    });
    try {
      await control(active.title).click();
      await expect(control(active.title)).toBeDisabled();
    } finally {
      release();
    }

    await expect(row(active.title).getByText('CANCELLED', { exact: true })).toBeVisible();
    await page.reload();
    await expect(row(active.title).getByText('CANCELLED', { exact: true })).toBeVisible();
    await expect(control(active.title)).toHaveCount(0);
    await expect(control(cancelled.title)).toHaveCount(0);

    await expect(row(started.title).getByText('ACTIVE', { exact: true })).toBeVisible();
    const refused = page.waitForResponse((response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === path(started.id),
    );
    await control(started.title).click();
    const response = await refused;
    expect(response.status()).toBe(409);
    await expect(page.getByRole('alert')).toContainText('This event has already started.');
    await expect(row(started.title).getByText('ACTIVE', { exact: true })).toBeVisible();
    await expect(control(started.title)).toBeEnabled();
  } finally {
    try {
      const title = { in: fixtures.map((fixture) => fixture.title) };
      await prisma.$transaction([
        prisma.registration.deleteMany({ where: { event: { title } } }),
        prisma.event.deleteMany({ where: { title } }),
      ]);
    } finally {
      await prisma.$disconnect();
    }
  }
});
