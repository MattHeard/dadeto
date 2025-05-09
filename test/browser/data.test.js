import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fetchAndCacheBlogData, getData, setData, getDeepStateCopy, shouldUseExistingFetch, deepMerge, shouldCopyStateForFetch } from '../../src/browser/data.js';

describe('shouldCopyStateForFetch', () => {
  it('returns true for idle', () => {
    expect(shouldCopyStateForFetch('idle')).toBe(true);
  });
  it('returns true for error', () => {
    expect(shouldCopyStateForFetch('error')).toBe(true);
  });
  it('returns false for loaded', () => {
    expect(shouldCopyStateForFetch('loaded')).toBe(false);
  });
  it('returns false for loading', () => {
    expect(shouldCopyStateForFetch('loading')).toBe(false);
  });
});

describe('deepMerge', () => {
  it('should use the if branch when shouldDeepMerge is true (deep merge plain objects)', () => {
    const target = { a: { x: 1 }, b: 2 };
    const source = { a: { y: 3 }, c: 4 };
    const merged = deepMerge(target, source);
    // a should be deeply merged, b and c should be present
    expect(merged).toEqual({ a: { x: 1, y: 3 }, b: 2, c: 4 });
  });
});


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

    const result = fetchAndCacheBlogData(state, mockFetch, { logInfo: mockLog, logError: mockError });
    expect(result).toBe(promise);
    expect(mockLog).toHaveBeenCalledWith('Blog data fetch already in progress.');
  });

  it('should start fetching blog data and update state on success', async () => {
    const blogData = { title: 'Test Blog' };
    mockFetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(blogData) })
    );

    const promise = fetchAndCacheBlogData(state, mockFetch, { logInfo: mockLog, logError: mockError });
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

    const promise = fetchAndCacheBlogData(state, mockFetch, { logInfo: mockLog, logError: mockError });
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

    const promise = fetchAndCacheBlogData(state, mockFetch, { logInfo: mockLog, logError: mockError });
    await promise;

    expect(state.blogStatus).toBe('error');
    expect(state.blog).toBeNull();
    expect(state.blogFetchPromise).toBeNull();
    expect(state.blogError).toBe(error);
    expect(mockError).toHaveBeenCalledWith('Error fetching blog data:', error);
  });

  it('calls fetch with the correct URL and logs starting message', async () => {
    mockFetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );

    await fetchAndCacheBlogData(state, mockFetch, { logInfo: mockLog, logError: mockError });

    expect(mockFetch).toHaveBeenCalledWith('./blog.json');
    expect(mockLog).toHaveBeenCalledWith('Starting to fetch blog data...');
  });

  it('throws specific error when response is not ok', async () => {
    mockFetch = jest.fn(() => Promise.resolve({ ok: false, status: 418 }));

    const promise = fetchAndCacheBlogData(state, mockFetch, { logInfo: mockLog, logError: mockError });
    await promise;

    expect(state.blogStatus).toBe('error');
    expect(mockError).toHaveBeenCalledWith(
      'Error fetching blog data:',
      expect.objectContaining({ message: 'HTTP error! status: 418' })
    );
  });
});



describe('getData, setData, and getDeepStateCopy', () => {
  let state;
  let logFn;
  let errorFn;
  let warnFn;
  let fetchFn;

  beforeEach(() => {
    state = {
      blog: null,
      blogStatus: 'idle',
      blogError: null,
      blogFetchPromise: null,
    };
    logFn = jest.fn();
    errorFn = jest.fn();
    warnFn = jest.fn();
    fetchFn = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ blog: 'content' }) }));
  });

  it('getDeepStateCopy returns a deep copy', () => {
    const original = { blog: { content: 'x' } };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.blog).not.toBe(original.blog);
  });

  it('getData triggers fetch if status is idle', () => {
    const loggers = { logInfo: logFn, logError: errorFn, logWarning: warnFn };
    getData(state, fetchFn, loggers);
    expect(fetchFn).toHaveBeenCalled();
  });

  it('getData logs warning on error state', () => {
    state.blogStatus = 'error';
    const loggers = { logInfo: logFn, logError: errorFn, logWarning: warnFn };
    getData(state, fetchFn, loggers);
    expect(warnFn).toHaveBeenCalledWith('Blog data previously failed to load:', state.blogError);
  });

  it('getData does nothing when status is loaded', () => {
    state.blogStatus = 'loaded';
    const loggers = { logInfo: logFn, logError: errorFn, logWarning: warnFn };
    getData(state, fetchFn, loggers);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warnFn).not.toHaveBeenCalled();
  });

  it('getData omits internal state fields', async () => {
    state.blog = { title: 'x' };
    state.blogStatus = 'loaded';
    const loggers = { logInfo: logFn, logError: errorFn, logWarning: warnFn };
    const result = getData(state, fetchFn, loggers);
    expect(result.blog).toEqual({ title: 'x' });
    expect(result).not.toHaveProperty('blogStatus');
    expect(result).not.toHaveProperty('blogError');
    expect(result).not.toHaveProperty('blogFetchPromise');
  });

  it('setData preserves existing blog if incoming state omits it', () => {
    state.blog = { title: 'preserved' };
    const incomingState = { temporary: true }; // no blog field
    setData({ desired: incomingState, current: state }, { logInfo: logFn, logError: errorFn });
    expect(state.blog).toEqual({ title: 'preserved' }); // blog should be preserved
  });

  it('setData logs specific error message when blog is missing', () => {
    expect(() =>
      setData(
        { desired: {}, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setData received invalid data structure:',
      {}
    );
  });

  it('setData throws and logs error if incoming state is object but lacks temporary property', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    const invalidState = { foo: 1 };
    expect(() => setData({ desired: invalidState, current: state }, { logInfo: logFn, logError: errorFn })).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setData received invalid data structure:',
      invalidState
    );
  });

  it('setData throws and logs error if incoming state is null', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    expect(() => setData({ desired: null, current: state }, { logInfo: logFn, logError: errorFn })).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setData received invalid data structure:',
      null
    );
  });

  it('setData throws and logs error if incoming state is undefined', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    expect(() => setData({ desired: undefined, current: state }, { logInfo: logFn, logError: errorFn })).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setData received invalid data structure:',
      undefined
    );
  });

  it('setData throws and logs error if incoming state is an object with no prototype and no properties', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    const invalidState = Object.create(null);
    expect(() => setData({ desired: invalidState, current: state }, { logInfo: logFn, logError: errorFn })).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setData received invalid data structure:',
      invalidState
    );
  });

  it('shouldUseExistingFetch returns true and logs when loading and promise exists', () => {
    const state = {
      blogStatus: 'loading',
      blogFetchPromise: Promise.resolve(),
    };
    const logFn = jest.fn();
    const result = shouldUseExistingFetch(state, logFn);
    expect(result).toBe(true);
    expect(logFn).toHaveBeenCalledWith('Blog data fetch already in progress.');
  });

  it('shouldUseExistingFetch returns false if status is not loading', () => {
    const state = {
      blogStatus: 'idle',
      blogFetchPromise: Promise.resolve(),
    };
    const logFn = jest.fn();
    const result = shouldUseExistingFetch(state, logFn);
    expect(result).toBe(false);
    expect(logFn).not.toHaveBeenCalled();
  });

  it('shouldUseExistingFetch returns false if status is loading but no fetchPromise exists', () => {
    const state = {
      blogStatus: 'loading',
      blogFetchPromise: null,
    };
    const logFn = jest.fn();
    const result = shouldUseExistingFetch(state, logFn);
    expect(result).toBe(false);
    expect(logFn).not.toHaveBeenCalled();
  });

  it('getData returns cached blog data when already loaded', () => {
    const blog = { title: 'Cached' };
    state.blog = blog;
    state.blogStatus = 'loaded';

    const loggers = { logInfo: logFn, logError: errorFn, logWarning: warnFn };
    const result = getData(state, fetchFn, loggers);

    expect(result.blog).toEqual(blog);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
