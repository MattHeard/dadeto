import { describe, it, expect, jest } from '@jest/globals';

/**
 * Dynamically import data module to ensure BLOG_STATUS initialization
 * is attributed to this test for mutation coverage.
 */

describe('BLOG_STATUS dynamic import', () => {
  it('fetchAndCacheBlogData uses BLOG_STATUS values', async () => {
    const { fetchAndCacheBlogData } = await import('../../src/browser/data.js');
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    const loggers = { logInfo: jest.fn(), logError: jest.fn() };

    const promise = fetchAndCacheBlogData(state, fetchFn, loggers);
    expect(state.blogStatus).toBe('loading');
    await promise;
    expect(state.blogStatus).toBe('loaded');
  });

  it('shouldCopyStateForFetch relies on BLOG_STATUS constants', async () => {
    const { shouldCopyStateForFetch } = await import('../../src/browser/data.js');
    expect(shouldCopyStateForFetch('idle')).toBe(true);
    expect(shouldCopyStateForFetch('error')).toBe(true);
    expect(shouldCopyStateForFetch('loaded')).toBe(false);
  });
});
