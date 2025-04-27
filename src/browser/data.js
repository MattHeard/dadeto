const INTERNAL_STATE_KEYS = ['blogStatus', 'blogError', 'blogFetchPromise'];

const BLOG_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error'
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

export function shouldUseExistingFetch(globalState, logFn) {
  if (isFetchInProgress(globalState)) {
    logFn('Blog data fetch already in progress.');
    return true;
  }
  return false;
}

/**
 * Wrapper for fetchAndCacheBlogData (for migration/testing).
 */
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

// Helper function needed by getData
export const getDeepStateCopy = (globalState) => JSON.parse(JSON.stringify(globalState));

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

function shouldCopyStateForFetch(status) {
  return status === BLOG_STATUS.IDLE || status === BLOG_STATUS.ERROR;
}

function hasTemporaryProperty(obj) {
  return Object.prototype.hasOwnProperty.call(obj, 'temporary');
}

function isInvalidState(value) {
  return (!value || typeof value !== 'object') || !hasTemporaryProperty(value);
}

function validateIncomingState(incomingState, errorFn) {
  if (isInvalidState(incomingState)) {
    errorFn('setData received invalid data structure:', incomingState);
    throw new Error("setData requires an object with at least a 'temporary' property.");
  }
}

function tryFetchingBlog(status, globalState, fetchFn, loggers) {
  if (status === BLOG_STATUS.IDLE) {
    fetchAndCacheBlogData(globalState, fetchFn, loggers);
  }
}

function maybeLogFetchError(status, error, logWarningFn) {
  if (status === BLOG_STATUS.ERROR) {
    logWarningFn("Blog data previously failed to load:", error);
  }
}

function handleBlogFetchState(status, error, globalState, fetchFn, loggers) {
  const { logInfo, logError, logWarning } = loggers;
  tryFetchingBlog(status, globalState, fetchFn, { logInfo, logError });
  maybeLogFetchError(status, error, logWarning);
}

/**
 * Gets a deep copy of the current global state, suitable for passing to toys.
 * It also handles initiating the blog data fetch if needed.
 * @param {object} globalState - The main application state.
 * @param {function} fetchFn - The fetch function.
 * @param {function} logFn - The logging function.
 * @param {function} errorFn - The error logging function.
 * @param {function} logWarningFn - The logWarninging logging function.
 * @returns {object} A deep copy of the relevant state for the toy.
 */
export const getData = (globalState, fetchFn, logFn, errorFn, logWarningFn) => {
  const { status, error } = getBlogState(globalState);
  const stateCopy = shouldCopyStateForFetch(status) ? getDeepStateCopy(globalState) : globalState;

  handleBlogFetchState(status, error, globalState, fetchFn, { logInfo: logFn, logError: errorFn, logWarning: logWarningFn });

  stripInternalFields(stateCopy);
  return stateCopy;
};

/**
 * Updates the global state, preserving internal fetch/blog properties.
 * @param {object} incomingState - The new state object (must have 'temporary').
 * @param {object} globalState - The current global state to modify.
 * @param {function} logFn - The logging function.
 * @param {function} errorFn - The error logging function.
 */
export const setData = (incomingState, globalState, logFn, errorFn) => {
  // Replace the entire global state, but validate basic structure
  validateIncomingState(incomingState, errorFn);
  const oldBlogState = getBlogState(globalState);
  Object.assign(globalState, incomingState);
  restoreBlogState(globalState, oldBlogState);

  logFn('Global state updated:', globalState);
};
