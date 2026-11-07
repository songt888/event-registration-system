import { describe, expect, it, vi } from 'vitest';
import { createEvent, parseCreateEvent, publishEvent } from './events.service.js';

const now = new Date('2026-12-01T10:00:00.000Z');
const ownerId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const valid = {
  title: 'Intro to Testing',
  description: 'Synthetic demo event',
  location: 'Room 101',
  startsAt: '2026-12-02T10:00:00.000Z',
  capacity: 10,
};

function fakeDb(event: unknown = null) {
  return {
    event: {
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(event),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function expectNoWrites(db: ReturnType<typeof fakeDb>) {
  expect(db.event.create).not.toHaveBeenCalled();
  expect(db.event.update).not.toHaveBeenCalled();
  expect(db.event.updateMany).not.toHaveBeenCalled();
}

describe('F-02 event service', () => {
  it.each([0, -1, 1.5, 10001, '10'])(
    'TEST-07 AC-07 rejects capacity %j with VALIDATION_ERROR',
    (capacity) => {
      expect(() => parseCreateEvent({ ...valid, capacity })).toThrow(
        expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' }),
      );
    },
  );

  it('TEST-29 AC-29 rejects a past startsAt on create without insert', async () => {
    const db = fakeDb();
    const input = parseCreateEvent({ ...valid, startsAt: '2026-11-30T10:00:00.000Z' });
    await expect(createEvent(db as never, ownerId, input, now)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_START_TIME',
    });
    expectNoWrites(db);
  });

  it('TEST-35 AC-35 rejects startsAt equal to now on create without insert', async () => {
    const db = fakeDb();
    const input = parseCreateEvent({ ...valid, startsAt: now.toISOString() });
    await expect(createEvent(db as never, ownerId, input, now)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_START_TIME',
    });
    expectNoWrites(db);
  });

  it('TEST-30 AC-30 rejects publishing an owned DRAFT whose startsAt equals now', async () => {
    const db = fakeDb({
      id: eventId,
      ownerId,
      status: 'DRAFT',
      startsAt: now,
      publishedAt: null,
    });
    await expect(publishEvent(db as never, ownerId, eventId, now)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_START_TIME',
    });
    expectNoWrites(db);
  });
});
