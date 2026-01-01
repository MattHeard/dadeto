import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  fetchAndCacheBlogData,
  getData,
  setLocalTemporaryData as setData,
  getDeepStateCopy,
  shouldUseExistingFetch,
  deepMerge,
  shouldCopyStateForFetch,
  getEncodeBase64,
  createBlogDataController,
} from '../../src/core/browser/data.js';

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

  it('replaces array values instead of merging them', () => {
    const target = { a: [1, 2] };
    const source = { a: [3, 4] };
    const merged = deepMerge(target, source);
    expect(merged).toEqual({ a: [3, 4] });
  });

  it('does not merge an array with an object', () => {
    const target = { a: [1, 2] };
    const source = { a: { x: 3 } };
    const merged = deepMerge(target, source);
    expect(merged).toEqual({ a: { x: 3 } });
  });

  it('replaces an object value when the source provides a primitive', () => {
    const target = { a: { x: 1 } };
    const source = { a: 5 };
    const merged = deepMerge(target, source);
    expect(merged).toEqual({ a: 5 });
  });
});

describe('fetchAndCacheBlogData', () => {
  let state;
  let mockFetch;
  let mockLog;
  let mockError;
  const createDependencies = () => ({
    fetch: mockFetch,
    loggers: {
      logInfo: mockLog,
      logError: mockError,
      logWarning: jest.fn(),
    },
  });

  beforeEach(() => {
    state = {
      blog: null,
      blogStatus: null,
      blogError: null,
      blogFetchPromise: null,
    };
    mockFetch = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();
  });

  it('should prevent multiple simultaneous fetches', async () => {
    const promise = Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
    state.blogStatus = 'loading';
    state.blogFetchPromise = promise;

    const result = fetchAndCacheBlogData(state, createDependencies());
    expect(result).toBe(promise);
    expect(mockLog).toHaveBeenCalledWith(
      'Blog data fetch already in progress.'
    );
  });

  it('throws when a fetch is marked in progress without a promise', () => {
    const stateWithFlakyPromise = {
      blog: null,
      blogStatus: 'loading',
      blogError: null,
    };
    let readCount = 0;
    Object.defineProperty(stateWithFlakyPromise, 'blogFetchPromise', {
      get() {
        readCount += 1;
        return readCount === 1 ? Promise.resolve() : null;
      },
    });

    expect(() =>
      fetchAndCacheBlogData(stateWithFlakyPromise, createDependencies())
    ).toThrow('Blog fetch marked as in progress without an active promise.');
    expect(mockLog).toHaveBeenCalledWith(
      'Blog data fetch already in progress.'
    );
  });

  it('should start fetching blog data and update state on success', async () => {
    const blogData = { title: 'Test Blog' };
    mockFetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(blogData) })
    );

    const promise = fetchAndCacheBlogData(state, createDependencies());
    expect(state.blogStatus).toBe('loading');
    expect(state.blogError).toBeNull();

    await promise;

    expect(state.blog).toEqual(blogData);
    expect(state.blogStatus).toBe('loaded');
    expect(state.blogFetchPromise).toBeNull();
    expect(mockLog).toHaveBeenCalledWith(
      'Blog data loaded successfully:',
      blogData
    );
  });

  it('should handle HTTP errors properly', async () => {
    mockFetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));

    const promise = fetchAndCacheBlogData(state, createDependencies());
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

    const promise = fetchAndCacheBlogData(state, createDependencies());
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

    await fetchAndCacheBlogData(state, createDependencies());

    expect(mockFetch).toHaveBeenCalledWith('./blog.json');
    expect(mockLog).toHaveBeenCalledWith('Starting to fetch blog data...');
  });

  it('throws specific error when response is not ok', async () => {
    mockFetch = jest.fn(() => Promise.resolve({ ok: false, status: 418 }));

    const promise = fetchAndCacheBlogData(state, createDependencies());
    await promise;

    expect(state.blogStatus).toBe('error');
    expect(mockError).toHaveBeenCalledWith(
      'Error fetching blog data:',
      expect.objectContaining({ message: 'HTTP error! status: 418' })
    );
  });
});

describe('createBlogDataController', () => {
  const createState = () => ({
    blog: null,
    blogStatus: 'idle',
    blogError: null,
    blogFetchPromise: null,
    temporary: {},
  });

  it('throws when dependency factory is not a function', () => {
    expect(() => createBlogDataController(null)).toThrow(
      'createBlogDataController expects a dependency factory function.'
    );
  });

  it('memoizes dependency factory results and wires helpers together', async () => {
    const storage = {
      getItem: jest.fn(() => '{}'),
      setItem: jest.fn(),
    };
    const fetchFn = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ title: 'x' }) })
    );
    const logInfo = jest.fn();
    const logError = jest.fn();
    const logWarning = jest.fn();
    const factory = jest.fn(() => ({
      fetch: fetchFn,
      loggers: { logInfo, logError, logWarning },
      storage,
    }));

    const controller = createBlogDataController(factory);
    const state = createState();
    const result = controller.getData(state);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ temporary: {} });

    await state.blogFetchPromise;
    expect(state.blogStatus).toBe('loaded');

    controller.setLocalTemporaryData({
      desired: { temporary: { value: 1 } },
      current: state,
    });
    expect(logError).not.toHaveBeenCalled();
    expect(state.temporary).toEqual({ value: 1 });

    controller.setLocalPermanentData({ widget: true });
    expect(storage.setItem).toHaveBeenCalledWith(
      'permanentData',
      JSON.stringify({ widget: true })
    );

    await controller.fetchAndCacheBlogData(state);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('normalizes missing warning logger', () => {
    const factory = () => ({
      fetch: jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      ),
      loggers: { logInfo: jest.fn(), logError: jest.fn() },
    });

    const controller = createBlogDataController(factory);
    const state = createState();
    state.blogStatus = 'error';
    state.blogError = new Error('boom');
    controller.getData(state);
    // Ensure absence of logWarning does not throw
    expect(state.blogError).toBeInstanceOf(Error);
  });

  it('throws when dependency factory returns a non-object', () => {
    const factory = () => null;

    const controller = createBlogDataController(factory);

    expect(() => controller.getData(createState())).toThrow(
      'createBlogDataController expected createDependencies to return an object.'
    );
  });

  it('throws when fetch dependency is not a function', () => {
    const factory = () => ({
      fetch: null,
      loggers: { logInfo: jest.fn(), logError: jest.fn() },
    });

    const controller = createBlogDataController(factory);

    expect(() => controller.getData(createState())).toThrow(
      'createBlogDataController requires fetch to be provided as a function.'
    );
  });

  it('throws when loggers container is not an object', () => {
    const factory = () => ({
      fetch: jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      ),
      loggers: null,
    });

    const controller = createBlogDataController(factory);

    expect(() => controller.getData(createState())).toThrow(
      'createBlogDataController requires loggers to be an object with logging functions.'
    );
  });

  it('throws when required logger functions are missing', () => {
    const factory = () => ({
      fetch: jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      ),
      loggers: { logInfo: 'nope', logError: jest.fn() },
    });

    const controller = createBlogDataController(factory);

    expect(() => controller.getData(createState())).toThrow(
      'createBlogDataController requires loggers.logInfo to be a function.'
    );
  });
});

describe('getData, setData, and getDeepStateCopy', () => {
  let state;
  let logFn;
  let errorFn;
  let warnFn;
  let fetchFn;
  const createDependencies = () => ({
    fetch: fetchFn,
    loggers: {
      logInfo: logFn,
      logError: errorFn,
      logWarning: warnFn,
    },
  });

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
    fetchFn = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ blog: 'content' }),
      })
    );
  });

  it('getDeepStateCopy returns a deep copy', () => {
    const original = { blog: { content: 'x' } };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.blog).not.toBe(original.blog);
  });

  it('getData triggers fetch if status is idle', () => {
    getData(state, createDependencies());
    expect(fetchFn).toHaveBeenCalled();
  });

  it('getData logs warning on error state', () => {
    state.blogStatus = 'error';
    getData(state, createDependencies());
    expect(warnFn).toHaveBeenCalledWith(
      'Blog data previously failed to load:',
      state.blogError
    );
  });

  it('uses default warning logger when dependency omits it', () => {
    state.blogStatus = 'error';
    state.blogError = new Error('load failure');
    const dependencies = {
      fetch: jest.fn(),
      loggers: { logInfo: jest.fn(), logError: jest.fn() },
    };

    expect(() => getData(state, dependencies)).not.toThrow();
    expect(dependencies.fetch).not.toHaveBeenCalled();
  });

  it('getData does nothing when status is loaded', () => {
    state.blogStatus = 'loaded';
    getData(state, createDependencies());
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warnFn).not.toHaveBeenCalled();
  });

  it('getData omits internal state fields', async () => {
    state.blog = { title: 'x' };
    state.blogStatus = 'loaded';
    const result = getData(state, createDependencies());
    expect(result.blog).toEqual({ title: 'x' });
    expect(result).not.toHaveProperty('blogStatus');
    expect(result).not.toHaveProperty('blogError');
    expect(result).not.toHaveProperty('blogFetchPromise');
  });

  it('getData returns a deep copy when status is idle', () => {
    state.blog = { title: 'copy test' };
    state.blogStatus = 'idle';
    const result = getData(state, createDependencies());
    expect(result).not.toBe(state);
    expect(result.blog).not.toBe(state.blog);
  });

  it('getData returns original object when status is loaded', () => {
    state.blog = { title: 'no copy' };
    state.blogStatus = 'loaded';
    const result = getData(state, createDependencies());
    expect(result).toBe(state);
  });

  it('getData does nothing when status is blank', () => {
    state.blogStatus = '';
    getData(state, createDependencies());
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warnFn).not.toHaveBeenCalled();
  });

  it('getData sets status to loading then loaded when fetch completes', async () => {
    const blogData = { title: 'blog' };
    fetchFn = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(blogData) })
    );
    getData(state, createDependencies());

    expect(state.blogStatus).toBe('loading');
    const promise = state.blogFetchPromise;
    await promise;

    expect(state.blogStatus).toBe('loaded');
    expect(state.blog).toEqual(blogData);
  });

  it('setData preserves existing blog if incoming state omits it', () => {
    state.blog = { title: 'preserved' };
    const incomingState = { temporary: true }; // no blog field
    setData(
      { desired: incomingState, current: state },
      { logInfo: logFn, logError: errorFn }
    );
    expect(state.blog).toEqual({ title: 'preserved' }); // blog should be preserved
  });

  it('setData preserves blog fetch related fields when incoming state omits them', () => {
    const fetchPromise = Promise.resolve();
    state.blogStatus = 'loading';
    state.blogError = new Error('err');
    state.blogFetchPromise = fetchPromise;
    state.blog = { title: 'preserved' };
    const incomingState = { temporary: false }; // omit blog fields
    setData(
      { desired: incomingState, current: state },
      { logInfo: logFn, logError: errorFn }
    );
    expect(state.blogStatus).toBe('loading');
    expect(state.blogError).toBeInstanceOf(Error);
    expect(state.blogFetchPromise).toBe(fetchPromise);
    expect(state.blog).toEqual({ title: 'preserved' });
  });

  it('setData restores existing blog fields when incoming state provides new ones', () => {
    const fetchPromise = Promise.resolve();
    const errorObj = new Error('old');
    state.blogStatus = 'loaded';
    state.blogError = errorObj;
    state.blogFetchPromise = fetchPromise;
    state.blog = { title: 'existing' };

    const incomingState = {
      temporary: true,
      blogStatus: 'idle',
      blogError: new Error('new'),
      blogFetchPromise: Promise.resolve(),
      blog: { title: 'incoming' },
    };

    setData(
      { desired: incomingState, current: state },
      { logInfo: logFn, logError: errorFn }
    );

    expect(state.blogStatus).toBe('loaded');
    expect(state.blogError).toBe(errorObj);
    expect(state.blogFetchPromise).toBe(fetchPromise);
    expect(state.blog).toEqual({ title: 'existing' });
  });

  it('setData keeps prior blog-related state when incoming state tries to replace it', () => {
    const originalPromise = {};
    const originalError = new Error('prev');
    state.blogStatus = 'loaded';
    state.blogError = originalError;
    state.blogFetchPromise = originalPromise;
    state.blog = { title: 'preserve' };

    const incomingState = {
      temporary: true,
      blogStatus: 'idle',
      blogError: new Error('new'),
      blogFetchPromise: {},
      blog: { title: 'incoming' },
    };

    setData(
      { desired: incomingState, current: state },
      { logInfo: logFn, logError: errorFn }
    );

    expect(state.blogStatus).toBe('loaded');
    expect(state.blogError).toBe(originalError);
    expect(state.blogFetchPromise).toBe(originalPromise);
    expect(state.blog).toEqual({ title: 'preserve' });
  });

  it('setData logs specific error message when blog is missing', () => {
    expect(() =>
      setData(
        { desired: {}, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow(
      "setLocalTemporaryData requires an object with at least a 'temporary' property."
    );
    expect(errorFn).toHaveBeenCalledWith(
      'setLocalTemporaryData received invalid data structure:',
      {}
    );
  });

  it('setData throws a descriptive error when blog data is missing', () => {
    expect(() =>
      setData(
        { desired: {}, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow(
      "setLocalTemporaryData requires an object with at least a 'temporary' property."
    );
  });

  it('setData throws and logs error if incoming state is object but lacks temporary property', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    const invalidState = { foo: 1 };
    expect(() =>
      setData(
        { desired: invalidState, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setLocalTemporaryData received invalid data structure:',
      invalidState
    );
  });

  it("setData throws an error with the expected message when 'temporary' is missing", () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    const invalidState = { foo: 1 };
    expect(() =>
      setData(
        { desired: invalidState, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow(
      "setLocalTemporaryData requires an object with at least a 'temporary' property."
    );
  });

  it('setData throws and logs error if incoming state is null', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    expect(() =>
      setData(
        { desired: null, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setLocalTemporaryData received invalid data structure:',
      null
    );
  });

  it('setData throws and logs error if incoming state is undefined', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    expect(() =>
      setData(
        { desired: undefined, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setLocalTemporaryData received invalid data structure:',
      undefined
    );
  });

  it('setData throws and logs error if incoming state is an object with no prototype and no properties', () => {
    const state = { blog: { title: 'preserved' } };
    const logFn = jest.fn();
    const errorFn = jest.fn();
    const invalidState = Object.create(null);
    expect(() =>
      setData(
        { desired: invalidState, current: state },
        { logInfo: logFn, logError: errorFn }
      )
    ).toThrow();
    expect(errorFn).toHaveBeenCalledWith(
      'setLocalTemporaryData received invalid data structure:',
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

    const result = getData(state, createDependencies());

    expect(result.blog).toEqual(blog);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('getEncodeBase64 returns a function that encodes to base64 using provided helpers', () => {
    let btoaFn;
    if (typeof btoa !== 'undefined') {
      btoaFn = btoa;
    } else {
      btoaFn = str => Buffer.from(str, 'binary').toString('base64');
    }
    const encodeURIComponentFn = encodeURIComponent;
    const encodeBase64 = getEncodeBase64(btoaFn, encodeURIComponentFn);
    const input = 'hello world!';
    expect(encodeBase64(input)).toBe('aGVsbG8gd29ybGQh');
  });
});
