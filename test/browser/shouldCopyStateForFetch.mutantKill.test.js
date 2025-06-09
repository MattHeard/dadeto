import { describe, it, expect, jest } from '@jest/globals';
import { shouldCopyStateForFetch, getData } from '../../src/browser/data.js';

// Additional test to ensure BLOG_STATUS.IDLE mutations are caught

describe('shouldCopyStateForFetch mutant kill', () => {
  it('returns true for idle and getData triggers fetch', () => {
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    const loggers = { logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() };

    expect(shouldCopyStateForFetch('idle')).toBe(true);
    getData(state, fetchFn, loggers);
    expect(fetchFn).toHaveBeenCalled();
  });
});
