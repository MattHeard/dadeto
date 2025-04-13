function getBlogState(state) {
  return {
    status: state.blogStatus,
    error: state.blogError,
    fetchPromise: state.blogFetchPromise,
    data: state.blog,
  };
}

function shouldUseExistingFetch(state, logFn) {
  const { status, fetchPromise } = getBlogState(state);
  return status === 'loading' && fetchPromise && (logFn('Blog data fetch already in progress.'), true);
} 

/**
 * Fetches blog data and updates the global state.
 * Ensures only one fetch happens at a time.
 * @param {object} state - The global state object.
 * @param {function} fetchFn - The fetch function to use.
 * @param {function} logFn - The logging function to use.
 * @param {function} errorFn - The error logging function to use.
 */
export function fetchAndCacheBlogData(state, fetchFn, logFn, errorFn) {
  // Prevent multiple simultaneous fetches
  const { status, fetchPromise } = getBlogState(state);
  if (status === 'loading' && fetchPromise && (logFn('Blog data fetch already in progress.'), true)) {
    return fetchPromise; 
  }
  
  logFn('Starting to fetch blog data...');
  state.blogStatus = 'loading';
  state.blogError = null;
  
  state.blogFetchPromise = fetchFn('./blog.json') 
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      state.blog = data; // Update the blog property
      state.blogStatus = 'loaded';
      logFn('Blog data loaded successfully:', data);
    })
    .catch(err => {
      state.blogStatus = 'error';
      state.blogError = err;
      errorFn('Error fetching blog data:', err);
    })
    .finally(() => {
      state.blogFetchPromise = null; // Clear the promise tracking
    });
  
  return state.blogFetchPromise; // Return the promise for potential chaining
}

// Helper function needed by getData
export const getDeepStateCopy = (state) => JSON.parse(JSON.stringify(state));

function stripInternalFields(state) {
  const internalKeys = ['blogStatus', 'blogError', 'blogFetchPromise'];
  for (const key of internalKeys) {
    delete state[key];
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
  if (globalStatus === 'idle' || globalStatus === 'error') {
    stateCopy = getDeepStateCopy(globalState);
  }
  
  // Check blog status and trigger fetch if needed, but don't block
  const { status: copyStatus, error: copyError } = getBlogState(stateCopy);
  if (copyStatus === 'idle') {
    // Use the exported fetchAndCacheBlogData function from this module
    fetchAndCacheBlogData(globalState, fetchFn, logFn, errorFn); // Trigger fetch (no await)
  } else if (copyStatus === 'error') {
    warnFn("Blog data previously failed to load:", copyError);
  }
  
  // Remove fetch-related properties from the copy returned to the toy
  stripInternalFields(stateCopy);
  
  return stateCopy;
};

/**
 * Updates the global state, preserving internal fetch/blog properties.
 * @param {object} newData - The new state object (must have 'temporary').
 * @param {object} globalState - The current global state to modify.
 * @param {function} logFn - The logging function.
 * @param {function} errorFn - The error logging function.
 */
export const setData = (newData, globalState, logFn, errorFn) => {
  // Replace the entire global state, but validate basic structure
  if (typeof newData === 'object' && newData !== null && newData.hasOwnProperty('temporary')) {
    // Preserve the internal blog loading state properties when updating
    const currentBlogStatus = globalState.blogStatus;
    const currentBlogError = globalState.blogError;
    const currentBlogFetchPromise = globalState.blogFetchPromise;
    const currentBlogData = globalState.blog; // Preserve actual blog data too
    
    // Overwrite the globalState reference with newData
    // WARNING: This might not modify the original object in the caller's scope 
    // if globalState was passed by value (which objects usually aren't, but be mindful).
    // A safer pattern might be to mutate properties directly: globalState.temporary = newData.temporary, etc.
    // Or return the new state and let the caller assign it.
    // For now, assuming this reassignment works as intended in the current structure.
    Object.assign(globalState, newData); // More robust way to merge/update
    
    // Restore internal properties that shouldn't be overwritten by toys
    globalState.blogStatus = currentBlogStatus;
    globalState.blogError = currentBlogError;
    globalState.blogFetchPromise = currentBlogFetchPromise;
    // Ensure the blog data wasn't wiped out if it wasn't included in newData
    if (!newData.hasOwnProperty('blog')) {
      globalState.blog = currentBlogData;
    }
    
    logFn('Global state updated:', globalState);
  } else {
    errorFn('setData received invalid data structure:', newData);
    throw new Error('setData requires an object with at least a \'temporary\' property.');
  }
};
