// C-02 (#91): temporary failing check. This branch exists only to show that a failed `test-and-docker`
// blocks the merge into lab5-staging. Never merge it; the PR is closed unmerged after the screenshot.
import { describe, expect, it } from 'vitest';

describe('C-02 temporary failing check (never merged)', () => {
  it('fails on purpose so the required check blocks the merge', () => {
    expect('failing on purpose').toBe('the merge must be blocked');
  });
});
