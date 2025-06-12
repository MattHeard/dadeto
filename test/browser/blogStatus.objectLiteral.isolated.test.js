import { describe, it, expect, jest } from '@jest/globals';

describe('BLOG_STATUS isolated import', () => {
  it('exposes correct values via functions', async () => {
    await jest.isolateModulesAsync(async () => {
      const {
        fetchAndCacheBlogData,
        shouldUseExistingFetch,
        shouldCopyStateForFetch,
      } = await import('../../src/browser/data.js');

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
});
