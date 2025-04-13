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

function shouldUseExistingFetch(globalState, logFn) {
  const { status, fetchPromise } = getBlogState(globalState);
  return status === BLOG_STATUS.LOADING && fetchPromise && (logFn('Blog data fetch already in progress.'), true);
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
  const { status, fetchPromise } = getBlogState(globalState);
  if (status === BLOG_STATUS.LOADING && fetchPromise && (logFn('Blog data fetch already in progress.'), true)) {
    return fetchPromise; 
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
  const internalKeys = ['blogStatus', 'blogError', 'blogFetchPromise'];
  for (const key of internalKeys) {
    delete stateCopy[key];
  }
}

function restoreBlogState(globalState, blogState) {
  globalState.blogStatus = blogState.status;
  globalState.blogError = blogState.error;
  globalState.blogFetchPromise = blogState.fetchPromise;
  if (!globalState.hasOwnProperty('blog')) {
    globalState.blog = blogState.data;
  }
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
  // Return a deep copy of the current global state
  let stateCopy = globalState;
  const { status: globalStatus } = getBlogState(globalState);
  if (globalStatus === BLOG_STATUS.IDLE || globalStatus === BLOG_STATUS.ERROR) {
    stateCopy = getDeepStateCopy(globalState);
  }
  
  // Check blog status and trigger fetch if needed, but don't block
  const { status: copyStatus, error: copyError } = getBlogState(stateCopy);
  if (copyStatus === BLOG_STATUS.IDLE) {
    // Use the exported fetchAndCacheBlogData function from this module
    fetchAndCacheBlogData(globalState, fetchFn, logFn, errorFn); // Trigger fetch (no await)
  } else if (copyStatus === BLOG_STATUS.ERROR) {
    warnFn("Blog data previously failed to load:", copyError);
  }
  
  // Remove fetch-related properties from the copy returned to the toy
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
  if (typeof incomingState === 'object' && incomingState !== null && incomingState.hasOwnProperty('temporary')) {
    const oldBlogState = getBlogState(globalState);
    Object.assign(globalState, incomingState);
    restoreBlogState(globalState, oldBlogState);
    
    logFn('Global state updated:', globalState);
  } else {
    errorFn('setData received invalid data structure:', incomingState);
    throw new Error('setData requires an object with at least a \'temporary\' property.');
  }
};
