import { describe, test, expect, jest } from '@jest/globals';
import {
  fetchAndCacheBlogData,
  shouldCopyStateForFetch,
} from '../../src/browser/data.js';

describe('BLOG_STATUS constant behavior', () => {
  test('shouldCopyStateForFetch returns correct booleans', () => {
    expect(shouldCopyStateForFetch('idle')).toBe(true);
    expect(shouldCopyStateForFetch('error')).toBe(true);
    expect(shouldCopyStateForFetch('loaded')).toBe(false);
    expect(shouldCopyStateForFetch('loading')).toBe(false);
  });

  test('fetchAndCacheBlogData updates state using BLOG_STATUS values', async () => {
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
