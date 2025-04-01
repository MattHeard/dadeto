import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fetchAndCacheBlogData } from '../../src/browser/data.js'; // Adjust path as needed

describe('fetchAndCacheBlogData', () => {
  let state;
  let mockFetch;
  let mockLog;
  let mockError;

  beforeEach(() => {
    state = {
      blog: null,
      blogStatus: null,
      blogError: null,
      blogFetchPromise: null,
    };
    mockLog = jest.fn();
    mockError = jest.fn();
  });

  it('should prevent multiple simultaneous fetches', async () => {
    const promise = Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    state.blogStatus = 'loading';
    state.blogFetchPromise = promise;

    const result = fetchAndCacheBlogData(state, mockFetch, mockLog, mockError);
    expect(result).toBe(promise);
    expect(mockLog).toHaveBeenCalledWith('Blog data fetch already in progress.');
  });

  it('should start fetching blog data and update state on success', async () => {
    const blogData = { title: 'Test Blog' };
    mockFetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(blogData) })
    );

    const promise = fetchAndCacheBlogData(state, mockFetch, mockLog, mockError);
    expect(state.blogStatus).toBe('loading');
    expect(state.blogError).toBeNull();

    await promise;

    expect(state.blog).toEqual(blogData);
    expect(state.blogStatus).toBe('loaded');
    expect(state.blogFetchPromise).toBeNull();
    expect(mockLog).toHaveBeenCalledWith('Blog data loaded successfully:', blogData);
  });

  it('should handle HTTP errors properly', async () => {
    mockFetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));

    const promise = fetchAndCacheBlogData(state, mockFetch, mockLog, mockError);
    await promise;

    expect(state.blogStatus).toBe('error');
    expect(state.blog).toBeNull();
    expect(state.blogFetchPromise).toBeNull();
    expect(state.blogError).toBeInstanceOf(Error);
    expect(mockError).toHaveBeenCalledWith(
      'Error fetching blog data:',
      expect.any(Error)
    );
  });

  it('should handle fetch exceptions', async () => {
    const error = new Error('Network failure');
    mockFetch = jest.fn(() => Promise.reject(error));

    const promise = fetchAndCacheBlogData(state, mockFetch, mockLog, mockError);
    await promise;

    expect(state.blogStatus).toBe('error');
    expect(state.blog).toBeNull();
    expect(state.blogFetchPromise).toBeNull();
    expect(state.blogError).toBe(error);
    expect(mockError).toHaveBeenCalledWith('Error fetching blog data:', error);
  });
});
