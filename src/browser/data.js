const INTERNAL_STATE_KEYS = ['blogStatus', 'blogError', 'blogFetchPromise'];

const BLOG_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

function getBlogState(globalState) {
  return {
    status: globalState.blogStatus,
    error: globalState.blogError,
    fetchPromise: globalState.blogFetchPromise,
    data: globalState.blog,
  };
}

function isFetchInProgress(globalState) {
  const { status, fetchPromise } = getBlogState(globalState);
  return status === BLOG_STATUS.LOADING && fetchPromise;
}

/**
 * Checks if a blog fetch is already in progress.
 * @param {object} globalState - The application state.
 * @param {function} logFn - Logging function used when fetch is active.
 * @returns {boolean} True if a fetch is already running.
 */
export function shouldUseExistingFetch(globalState, logFn) {
  if (isFetchInProgress(globalState)) {
    logFn('Blog data fetch already in progress.');
    return true;
  }
  return false;
}

/**
 * Returns a Base64 encoding function using the provided btoa, unescape, and encodeURIComponent.
 * @param {function} btoa - The btoa function
 * @param {function} unescape - The unescape function
 * @param {function} encodeURIComponent - The encodeURIComponent function
 * @returns {function} encodeBase64 - Function that encodes a string to Base64
 */
export function getEncodeBase64(btoa, unescape, encodeURIComponent) {
  return str => btoa(unescape(encodeURIComponent(str)));
}

/**
 * Wrapper for fetchAndCacheBlogData with explicit arguments.
 * @param {object} state - The global state object.
 * @param {function} fetch - The fetch function to use.
 * @param {object} loggers - The logging functions object.
 * @param {function} loggers.logInfo - The logging function to use.
 * @param {function} loggers.logError - The error logging function to use.
 */
export function fetchAndCacheBlogData(state, fetch, loggers) {
  const { logInfo, logError } = loggers;

  // Prevent multiple simultaneous fetches
  if (isFetchInProgress(state)) {
    logInfo('Blog data fetch already in progress.');
    return state.blogFetchPromise;
  }

  logInfo('Starting to fetch blog data...');
  state.blogStatus = BLOG_STATUS.LOADING;
  state.blogError = null;

  state.blogFetchPromise = fetch('./blog.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      state.blog = data; // Update the blog property
      state.blogStatus = BLOG_STATUS.LOADED;
      logInfo('Blog data loaded successfully:', data);
    })
    .catch(err => {
      state.blogStatus = BLOG_STATUS.ERROR;
      state.blogError = err;
      logError('Error fetching blog data:', err);
    })
    .finally(() => {
      state.blogFetchPromise = null; // Clear the promise tracking
    });

  return state.blogFetchPromise; // Return the promise for potential chaining
}

/**
 * Creates a deep copy of the provided state.
 * @param {object} globalState - The state to copy.
 * @returns {object} A cloned version of the state.
 */
export const getDeepStateCopy = globalState =>
  JSON.parse(JSON.stringify(globalState));

/**
 * Deeply merges two objects. Creates a new object with merged properties.
 * Properties in source will overwrite properties in target, unless both
 * properties are plain objects, in which case they are recursively merged.
 * Arrays and other types are overwritten, not merged.
 * @param {object} target - The target object.
 * @param {object} source - The source object.
 * @returns {object} A new object representing the merged result.
 */
function bothAreNotArrays(a, b) {
  return !Array.isArray(a) && !Array.isArray(b);
}

function bothAreNonNullObjects(a, b) {
  return isNonNullObject(a) && isNonNullObject(b);
}

function shouldDeepMerge(targetValue, sourceValue) {
  return (
    bothAreNonNullObjects(targetValue, sourceValue) &&
    bothAreNotArrays(targetValue, sourceValue)
  );
}

export function deepMerge(target, source) {
  const output = { ...target };
  const mergeKey = key => {
    const targetValue = target[key];
    const sourceValue = source[key];
    if (shouldDeepMerge(targetValue, sourceValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  };
  Object.keys(source).forEach(mergeKey);
  return output;
}

function stripInternalFields(stateCopy) {
  for (const key of INTERNAL_STATE_KEYS) {
    delete stateCopy[key];
  }
}

function restoreBlogState(globalState, blogState) {
  globalState.blogStatus = blogState.status;
  globalState.blogError = blogState.error;
  globalState.blogFetchPromise = blogState.fetchPromise;
  globalState.blog = blogState.data;
}

/**
 * Determines whether state should be cloned before a blog fetch.
 * @param {string} status - Current blog status value.
 * @returns {boolean} True when a deep copy should be made.
 */
export function shouldCopyStateForFetch(status) {
  return status === BLOG_STATUS.IDLE || status === BLOG_STATUS.ERROR;
}

/**
 * Determine if an object includes its own `temporary` property.
 * @param {object} obj
 * @returns {boolean}
 */
function hasTemporaryProperty(obj) {
  return Object.hasOwn(obj, 'temporary');
}

function isNonNullObject(value) {
  return Boolean(value) && typeof value === 'object';
}

function isInvalidState(value) {
  return !isNonNullObject(value) || !hasTemporaryProperty(value);
}

function validateIncomingState(incomingState, errorFn) {
  if (isInvalidState(incomingState)) {
    errorFn('setData received invalid data structure:', incomingState);
    throw new Error(
      "setData requires an object with at least a 'temporary' property."
    );
  }
}

function isIdleStatus(state) {
  return getBlogState(state).status === BLOG_STATUS.IDLE;
}

function tryFetchingBlog(state, fetch) {
  if (isIdleStatus(state)) {
    fetch();
  }
}

function maybeLogFetchError(state, logWarning) {
  const blogState = getBlogState(state);
  if (blogState.status === BLOG_STATUS.ERROR) {
    logWarning('Blog data previously failed to load:', blogState.error);
  }
}

function handleBlogFetchState(state, fetch, loggers) {
  const doFetch = () => fetchAndCacheBlogData(state, fetch, loggers);
  tryFetchingBlog(state, doFetch);
  const { logWarning } = loggers;
  maybeLogFetchError(state, logWarning);
}

/**
 * Returns a deep copy of state if needed for fetch, otherwise returns state itself.
 * @param {object} state
 * @returns {object}
 */
function shouldDeepCopyForFetch(status) {
  return status === 'idle' || status === 'error';
}

/**
 * Provides either the original state or a deep copy depending on status.
 * @param {object} state - Global application state.
 * @returns {object} State or a deep clone when needed.
 */
function getRelevantStateCopy(state) {
  const status = state.blogStatus;
  if (shouldDeepCopyForFetch(status)) {
    return JSON.parse(JSON.stringify(state));
  }
  return state;
}

/**
 * Gets a deep copy of the current global state, suitable for passing to toys.
 * It also handles initiating the blog data fetch if needed.
 * @query
 * @param {object} state - The main application state.
 * @param {function} fetch - The fetch function.
 * @param {object} loggers - An object with logInfo, logError, and logWarning functions.
 * @returns {object} A deep copy of the relevant state for the toy.
 */
export const getData = (state, fetch, loggers) => {
  const stateCopy = getRelevantStateCopy(state);
  handleBlogFetchState(state, fetch, loggers);
  stripInternalFields(stateCopy);
  return stateCopy;
};
/**
 * Updates the global state with incoming data while preserving internal
 * blog-fetch properties.
 * @param {object} state - Contains desired and current state objects.
 * @param {object} state.desired - The new state object (must have 'temporary').
 * @param {object} state.current - The global state to be modified.
 * @param {object} loggers - Logging functions.
 * @param {function} loggers.logInfo - Information logger.
 * @param {function} loggers.logError - Error logger.
 */
export const setData = (state, loggers) => {
  const { desired, current } = state;
  const { logError } = loggers;
  // Validate incoming state
  validateIncomingState(desired, logError);
  const oldBlogState = getBlogState(current);
  Object.assign(current, desired);
  restoreBlogState(current, oldBlogState);
};
