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
