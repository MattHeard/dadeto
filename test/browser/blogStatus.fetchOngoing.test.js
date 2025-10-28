import { describe, it, expect, jest } from '@jest/globals';
import {
  fetchAndCacheBlogData,
  shouldUseExistingFetch,
} from '../../src/core/browser/data.js';

describe('BLOG_STATUS ongoing fetch detection', () => {
  it('detects fetch in progress via shouldUseExistingFetch', async () => {
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    let resolve;
    const fetchPromise = new Promise(r => {
      resolve = r;
    });
    const fetchFn = jest.fn(() => fetchPromise);
    const dependencies = {
      fetch: fetchFn,
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };

    const promise = fetchAndCacheBlogData(state, dependencies);

    expect(state.blogStatus).toBe('loading');
    const logFn = jest.fn();
    expect(shouldUseExistingFetch(state, logFn)).toBe(true);
    expect(logFn).toHaveBeenCalledWith('Blog data fetch already in progress.');

    resolve({ ok: true, json: () => Promise.resolve({}) });
    await promise;
  });
});
