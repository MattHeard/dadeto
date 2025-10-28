import { describe, it, expect, jest } from '@jest/globals';
import { fetchAndCacheBlogData } from '../../src/core/browser/data.js';

describe('fetchAndCacheBlogData error status', () => {
  it('sets blogStatus to "error" when fetch fails', async () => {
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));
    const loggers = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    };

    await fetchAndCacheBlogData(state, { fetch: fetchFn, loggers }).catch(
      () => {}
    );

    expect(state.blogStatus).toBe('error');
    expect(loggers.logError).toHaveBeenCalled();
  });
});
