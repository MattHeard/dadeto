import { describe, it, expect } from '@jest/globals';

describe('shouldCopyStateForFetch dynamic import', () => {
  it('returns true for idle and error statuses', async () => {
    const { shouldCopyStateForFetch } = await import(
      '../../src/browser/data.js'
    );
    expect(shouldCopyStateForFetch('idle')).toBe(true);
    expect(shouldCopyStateForFetch('error')).toBe(true);
  });
});
