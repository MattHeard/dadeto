import { describe, it, expect, jest } from '@jest/globals';
import {
  fetchAndCacheBlogData,
  shouldUseExistingFetch,
  shouldCopyStateForFetch,
} from '../../src/browser/data.js';

describe('BLOG_STATUS object literal mutant killer', () => {
  it('validates BLOG_STATUS values via exposed functions', async () => {
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    const loggers = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    };

    expect(shouldCopyStateForFetch('idle')).toBe(true);
    expect(shouldCopyStateForFetch('error')).toBe(true);
    expect(shouldCopyStateForFetch('loading')).toBe(false);
    expect(shouldCopyStateForFetch('loaded')).toBe(false);

    const promise = fetchAndCacheBlogData(state, fetchFn, loggers);
    expect(state.blogStatus).toBe('loading');
    await promise;
    expect(state.blogStatus).toBe('loaded');

    const existingState = {
      blogStatus: 'loading',
      blogFetchPromise: Promise.resolve(),
    };
    expect(shouldUseExistingFetch(existingState, jest.fn())).toBe(true);
  });
});
