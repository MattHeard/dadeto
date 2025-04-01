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
  if (state.blogStatus === 'loading' && state.blogFetchPromise) {
    logFn('Blog data fetch already in progress.');
    return state.blogFetchPromise; 
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
const getDeepStateCopy = (state) => JSON.parse(JSON.stringify(state));

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
  const stateCopy = getDeepStateCopy(globalState);
  
  // Check blog status and trigger fetch if needed, but don't block
  if (stateCopy.blogStatus === 'idle') {
    // Use the exported fetchAndCacheBlogData function from this module
    fetchAndCacheBlogData(globalState, fetchFn, logFn, errorFn); // Trigger fetch (no await)
  } else if (stateCopy.blogStatus === 'error') {
    warnFn("Blog data previously failed to load:", stateCopy.blogError);
  }
  
  // Remove fetch-related properties from the copy returned to the toy
  delete stateCopy.blogStatus;
  delete stateCopy.blogError;
  delete stateCopy.blogFetchPromise;
  
  return stateCopy;
};
