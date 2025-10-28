import { describe, it, expect, jest } from '@jest/globals';
import { fetchAndCacheBlogData } from '../../src/core/browser/data.js';

describe('BLOG_STATUS runtime values', () => {
  it('only assigns recognized status strings during fetch flow', async () => {
    const valid = ['idle', 'loading', 'loaded', 'error'];
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const successFetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    const loggers = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    };

    const promise = fetchAndCacheBlogData(state, {
      fetch: successFetch,
      loggers,
    });
    expect(valid).toContain(state.blogStatus);
    await promise;
    expect(valid).toContain(state.blogStatus);

    const failState = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const failFetch = jest.fn(() => Promise.reject(new Error('boom')));
    await fetchAndCacheBlogData(failState, {
      fetch: failFetch,
      loggers,
    });
    expect(valid).toContain(failState.blogStatus);
  });
});
