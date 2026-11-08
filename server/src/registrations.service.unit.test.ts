import { describe, expect, it } from 'vitest';
import { assertRegistrable } from './registrations.service.js';

describe('F-04 registration eligibility', () => {
  it('TEST-28 AC-28 rejects an event whose startsAt equals now with EVENT_STARTED', () => {
    const now = new Date('2026-12-01T10:00:00.000Z');
    expect(() => assertRegistrable({ status: 'PUBLISHED', startsAt: now }, now)).toThrow(
      expect.objectContaining({ code: 'EVENT_STARTED' }),
    );
    expect(() => assertRegistrable({ status: 'PUBLISHED', startsAt: new Date(now.getTime() + 1) }, now)).not.toThrow();
  });
});
