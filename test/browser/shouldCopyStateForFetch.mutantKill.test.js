import { describe, it, expect } from '@jest/globals';
import { shouldCopyStateForFetch } from '../../src/browser/data.js';

describe('shouldCopyStateForFetch mutant killer', () => {
  it('returns true only for "idle" or "error"', () => {
    expect(shouldCopyStateForFetch('idle')).toBe(true);
    expect(shouldCopyStateForFetch('error')).toBe(true);
    expect(shouldCopyStateForFetch('loaded')).toBe(false);
    expect(shouldCopyStateForFetch('loading')).toBe(false);
    expect(shouldCopyStateForFetch('')).toBe(false);
  });
});
