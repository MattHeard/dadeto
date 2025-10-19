import { describe, it, expect } from '@jest/globals';
import { shouldCopyStateForFetch } from '../../src/core/browser/data.js';

describe('shouldCopyStateForFetch with undefined', () => {
  it('returns false when status is undefined', () => {
    expect(shouldCopyStateForFetch(undefined)).toBe(false);
  });
});
