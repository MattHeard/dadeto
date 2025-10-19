import { describe, it, expect, jest } from '@jest/globals';
import { fetchAndCacheBlogData } from '../../src/core/browser/data.js';

describe('BLOG_STATUS constants integration', () => {
  it('fetchAndCacheBlogData transitions status from loading to loaded', async () => {
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

  it('fetchAndCacheBlogData transitions status to error on failure', async () => {
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() => Promise.reject(new Error('fail')));
    const loggers = { logInfo: jest.fn(), logError: jest.fn() };
    await fetchAndCacheBlogData(state, fetchFn, loggers);
    expect(state.blogStatus).toBe('error');
  });

  it('clears blogError and reuses BLOG_STATUS when retrying after failure', async () => {
    const state = {
      blog: null,
      blogStatus: 'error',
      blogError: new Error('previous failure'),
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    const loggers = { logInfo: jest.fn(), logError: jest.fn() };

    const promise = fetchAndCacheBlogData(state, fetchFn, loggers);
    expect(state.blogStatus).toBe('loading');
    expect(state.blogError).toBeNull();

    await promise;

    expect(state.blogStatus).toBe('loaded');
    expect(state.blogError).toBeNull();
  });
});
