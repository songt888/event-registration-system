import { describe, expect, it } from 'vitest';
import { isSessionExpired } from './session';

describe('F-01 session expiry rule', () => {
  const now = new Date('2026-11-20T09:00:00.000Z');

  it('TEST-40 AC-40 treats expiry before or exactly at now as expired, and later expiry as valid', () => {
    expect(isSessionExpired(new Date('2026-11-20T08:59:59.999Z'), now)).toBe(true);
    expect(isSessionExpired(new Date('2026-11-20T09:00:00.000Z'), now)).toBe(true);
    expect(isSessionExpired(new Date('2026-11-20T09:00:00.001Z'), now)).toBe(false);
  });
});
