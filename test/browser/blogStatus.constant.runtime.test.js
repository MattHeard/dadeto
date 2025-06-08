import { describe, it, expect, jest } from '@jest/globals';
import {
  fetchAndCacheBlogData,
  shouldUseExistingFetch,
} from '../../src/browser/data.js';

describe('BLOG_STATUS runtime usage', () => {
  it('shouldUseExistingFetch returns true when loading and promise exists', () => {
    const state = {
      blogStatus: 'loading',
      blogFetchPromise: Promise.resolve(),
    };
    const logFn = jest.fn();
    const result = shouldUseExistingFetch(state, logFn);
    expect(result).toBe(true);
    expect(logFn).toHaveBeenCalledWith('Blog data fetch already in progress.');
  });

  it('fetchAndCacheBlogData transitions status using BLOG_STATUS values', async () => {
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
});
