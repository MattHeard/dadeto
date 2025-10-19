import { describe, it, expect, jest } from '@jest/globals';
import { shouldUseExistingFetch } from '../../src/core/browser/data.js';

describe('shouldUseExistingFetch with undefined status', () => {
  it('returns false and does not log when status is undefined', () => {
    const state = {
      blogStatus: undefined,
      blogFetchPromise: Promise.resolve(),
    };
    const logFn = jest.fn();
    const result = shouldUseExistingFetch(state, logFn);
    expect(result).toBe(false);
    expect(logFn).not.toHaveBeenCalled();
  });
});
