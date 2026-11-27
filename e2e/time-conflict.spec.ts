import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/events$/);
}

// The seed gives participant1 an ACTIVE registration for Career talk.
test('TEST-61 AC-61 shows the time-conflict alert without changing places', async ({ page, browser }) => {
  const title = 'E2E time conflict event';
  const org = await (await browser.newContext()).newPage();
  await signIn(org, 'organizer2@example.com');

  const listed = await org.request.get('/api/events');
  expect(listed.status()).toBe(200);
  const { events } = await listed.json();
  const heldEvent = events.find((event: { title: string }) => event.title === 'Career talk (small room)');
  expect(heldEvent).toBeDefined();
  const startsAt = new Date(Date.parse(heldEvent.startsAt) + 60 * 60 * 1000).toISOString();
  const created = await org.request.post('/api/events', {
    data: { title, description: 'Created for TEST-61.', location: 'Room 201', startsAt, capacity: 5 },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const published = await org.request.post(`/api/events/${id}/publish`, { data: {} });
  expect(published.status()).toBe(200);
  await org.context().close();

  await signIn(page, 'participant1@example.com');
  await page.getByRole('link', { name: title }).click();
  const places = page.locator('.places p');
  await expect(places).toHaveText('5 of 5 places left');
  const before = await places.innerText();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'You are already registered for another event that starts within 2 hours of this one.',
  );
  await expect(places).toHaveText(before);
});
