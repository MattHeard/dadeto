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
 * Fetches blog data and updates the global state.
 * Ensures only one fetch happens at a time.
 * @param {object} globalState - The global state object.
 * @param {function} fetchFn - The fetch function to use.
 * @param {function} logFn - The logging function to use.
 * @param {function} errorFn - The error logging function to use.
 */
export function fetchAndCacheBlogData(globalState, fetchFn, logFn, errorFn) {
  // Prevent multiple simultaneous fetches
  if (isFetchInProgress(globalState)) {
    logFn('Blog data fetch already in progress.');
    return globalState.blogFetchPromise; 
  }
  
  logFn('Starting to fetch blog data...');
  globalState.blogStatus = BLOG_STATUS.LOADING;
  globalState.blogError = null;
  
  globalState.blogFetchPromise = fetchFn('./blog.json') 
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      globalState.blog = data; // Update the blog property
      globalState.blogStatus = BLOG_STATUS.LOADED;
      logFn('Blog data loaded successfully:', data);
    })
    .catch(err => {
      globalState.blogStatus = BLOG_STATUS.ERROR;
      globalState.blogError = err;
      errorFn('Error fetching blog data:', err);
    })
    .finally(() => {
      globalState.blogFetchPromise = null; // Clear the promise tracking
    });
  
  return globalState.blogFetchPromise; // Return the promise for potential chaining
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

function isInvalidState(value) {
  return (
    typeof value !== 'object' ||
    value === null ||
    !value.hasOwnProperty('temporary')
  );
}

function validateIncomingState(incomingState, errorFn) {
  if (isInvalidState(incomingState)) {
    errorFn('setData received invalid data structure:', incomingState);
    throw new Error("setData requires an object with at least a 'temporary' property.");
  }
}

function tryFetchingBlog(status, globalState, fetchFn, logFn, errorFn) {
  if (status === BLOG_STATUS.IDLE) {
    fetchAndCacheBlogData(globalState, fetchFn, logFn, errorFn);
  }
}

function maybeLogFetchError(status, error, warnFn) {
  if (status === BLOG_STATUS.ERROR) {
    warnFn("Blog data previously failed to load:", error);
  }
}

function handleBlogFetchState(status, error, globalState, fetchFn, logFn, errorFn, warnFn) {
  tryFetchingBlog(status, globalState, fetchFn, logFn, errorFn);
  maybeLogFetchError(status, error, warnFn);
}

/**
 * Gets a deep copy of the current global state, suitable for passing to toys.
 * It also handles initiating the blog data fetch if needed.
 * @param {object} globalState - The main application state.
 * @param {function} fetchFn - The fetch function.
 * @param {function} logFn - The logging function.
 * @param {function} errorFn - The error logging function.
 * @param {function} warnFn - The warning logging function.
 * @returns {object} A deep copy of the relevant state for the toy.
 */
export const getData = (globalState, fetchFn, logFn, errorFn, warnFn) => {
  const { status, error } = getBlogState(globalState);
  const stateCopy = shouldCopyStateForFetch(status) ? getDeepStateCopy(globalState) : globalState;

  handleBlogFetchState(status, error, globalState, fetchFn, logFn, errorFn, warnFn);

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
