import { describe, it, expect, jest } from '@jest/globals';
import { fetchAndCacheBlogData } from '../../src/browser/data.js';

describe('BLOG_STATUS transitions', () => {
  it('sets loading then loaded on successful fetch', async () => {
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

  it('sets error status on fetch failure', async () => {
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
});
