import { describe, it, expect, jest } from '@jest/globals';
import {
  fetchAndCacheBlogData,
  shouldCopyStateForFetch,
} from '../../src/core/browser/data.js';

describe('BLOG_STATUS fetch failure handling', () => {
  it('sets status to error on fetch rejection', async () => {
    const state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    const fetchFn = jest.fn(() => Promise.reject(new Error('fail')));
    const loggers = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    };

    await fetchAndCacheBlogData(state, { fetch: fetchFn, loggers });

    expect(state.blogStatus).toBe('error');
    expect(loggers.logError).toHaveBeenCalledWith(
      'Error fetching blog data:',
      expect.any(Error)
    );
    expect(shouldCopyStateForFetch(state.blogStatus)).toBe(true);
  });
});
