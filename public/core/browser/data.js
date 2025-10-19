import { deepClone } from '../objectUtils.js';
import { isNonNullObject } from '../state.js';

export { deepMerge } from '../state.js';
export { getEncodeBase64 } from '../encoding.js';

const INTERNAL_STATE_KEYS = ['blogStatus', 'blogError', 'blogFetchPromise'];

export const BLOG_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

/**
 * Extracts blog-related state from the global store.
 * @param {object} globalState - The application state object.
 * @returns {object} Blog-specific state fields.
 */
function getBlogState(globalState) {
  return {
    status: globalState.blogStatus,
    error: globalState.blogError,
    fetchPromise: globalState.blogFetchPromise,
    data: globalState.blog,
  };
}

/**
 * Checks whether a blog fetch is currently running.
 * @param {object} globalState - The application state.
 * @returns {boolean} True if a fetch promise is active.
 */
function isFetchInProgress(globalState) {
  const { status, fetchPromise } = getBlogState(globalState);
  return status === BLOG_STATUS.LOADING && fetchPromise;
}

/**
 * Checks if a blog fetch is already in progress.
 * @param {object} globalState - The application state.
 * @param {Function} logFn - Logging function used when fetch is active.
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
 * Wrapper for fetchAndCacheBlogData with explicit arguments.
 * @param {object} state - The global state object.
 * @param {Function} fetch - The fetch function to use.
 * @param {object} loggers - The logging functions object.
 * @param {Function} loggers.logInfo - The logging function to use.
 * @param {Function} loggers.logError - The error logging function to use.
 * @returns {Promise<unknown>} Promise resolving when fetch completes.
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
export const getDeepStateCopy = globalState => deepClone(globalState);

/**
 * Removes internal bookkeeping fields from a state copy.
 * @param {object} stateCopy - State object to sanitize.
 */
function stripInternalFields(stateCopy) {
  for (const key of INTERNAL_STATE_KEYS) {
    delete stateCopy[key];
  }
}

/**
 * Restores blog-related properties on the global state object.
 * @param {object} globalState - The global application state.
 * @param {object} blogState - Previously saved blog data.
 */
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
 * @param {object} obj - Object to inspect.
 * @returns {boolean} True when the property exists.
 */
function hasTemporaryProperty(obj) {
  return Object.hasOwn(obj, 'temporary');
}

/**
 * Determine whether a state object has required properties.
 * @param {object} value - Candidate state object.
 * @returns {boolean} True if the state is missing required fields.
 */
function isInvalidState(value) {
  return !isNonNullObject(value) || !hasTemporaryProperty(value);
}

/**
 * Validates incoming state before applying it to the global state.
 * @param {object} incomingState - Candidate state object.
 * @param {Function} errorFn - Error logger.
 * @returns {void}
 */
function validateIncomingState(incomingState, errorFn) {
  if (isInvalidState(incomingState)) {
    errorFn(
      'setLocalTemporaryData received invalid data structure:',
      incomingState
    );
    throw new Error(
      "setLocalTemporaryData requires an object with at least a 'temporary' property."
    );
  }
}

/**
 * Determine whether a permanent state object is invalid.
 * @param {object} value - Candidate state object.
 * @returns {boolean} True when the value is not a non-null object.
 */
function isInvalidPermanentState(value) {
  return !isNonNullObject(value);
}

/**
 * Validates incoming permanent state before applying it.
 * @param {object} incomingState - Candidate state object.
 * @param {Function} errorFn - Error logger.
 * @returns {void}
 */
function validateIncomingPermanentState(incomingState, errorFn) {
  if (isInvalidPermanentState(incomingState)) {
    errorFn(
      'setLocalPermanentData received invalid data structure:',
      incomingState
    );
    throw new Error('setLocalPermanentData requires an object.');
  }
}

/**
 * Checks whether the blog status is idle.
 * @param {object} state - The global state object.
 * @returns {boolean} True when status is IDLE.
 */
function isIdleStatus(state) {
  return getBlogState(state).status === BLOG_STATUS.IDLE;
}

/**
 * Triggers the provided fetch when the blog status is idle.
 * @param {object} state - Global state.
 * @param {Function} fetch - Blog fetch function.
 */
function tryFetchingBlog(state, fetch) {
  if (isIdleStatus(state)) {
    fetch();
  }
}

/**
 * Logs any stored fetch error when present.
 * @param {object} state - Global state object.
 * @param {Function} logWarning - Warning logger.
 */
function maybeLogFetchError(state, logWarning) {
  const blogState = getBlogState(state);
  if (blogState.status === BLOG_STATUS.ERROR) {
    logWarning('Blog data previously failed to load:', blogState.error);
  }
}

/**
 * Handles fetch-related state transitions and logging.
 * @param {object} state - Global state to update.
 * @param {Function} fetch - Fetch function.
 * @param {object} loggers - Logger functions.
 */
function handleBlogFetchState(state, fetch, loggers) {
  const doFetch = () => fetchAndCacheBlogData(state, fetch, loggers);
  tryFetchingBlog(state, doFetch);
  const { logWarning } = loggers;
  maybeLogFetchError(state, logWarning);
}

/**
 * Returns a deep copy of state if needed for fetch, otherwise returns state itself.
 * @param {string} status - Current blog status.
 * @returns {object} Either the original state or a clone.
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
    return deepClone(state);
  }
  return state;
}

/**
 * Gets a deep copy of the current global state, suitable for passing to toys.
 * It also handles initiating the blog data fetch if needed.
 * @param {object} state - The main application state.
 * @param {Function} fetch - The fetch function.
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
 * @param {Function} loggers.logInfo - Information logger.
 * @param {Function} loggers.logError - Error logger.
 */
export const setLocalTemporaryData = (state, loggers) => {
  const { desired, current } = state;
  const { logError } = loggers;
  // Validate incoming state
  validateIncomingState(desired, logError);
  const oldBlogState = getBlogState(current);
  Object.assign(current, desired);
  restoreBlogState(current, oldBlogState);
};

/**
 * Updates persistent data stored in localStorage.
 * Reads existing data, merges with the incoming object and persists the result.
 * @param {object} desired - The new state object.
 * @param {object} loggers - Logging functions.
 * @param {Function} loggers.logError - Error logger.
 * @param {Storage} [storage] - Storage used to persist data.
 * @returns {object} The merged permanent state.
 */

/**
 * Load existing permanent data from storage.
 * @param {Storage} storage - Storage used to persist data.
 * @param {Function} logError - Error logger.
 * @returns {object} Stored data object.
 */
function loadPermanentData(storage, logError) {
  if (!storage) {
    return {};
  }
  return loadDataFromStorage(storage, logError);
}

/**
 * Read and parse permanent data from storage.
 * @param {Storage} storage - Storage used to persist data.
 * @param {Function} logError - Error logger.
 * @returns {object} Stored data object.
 */
function loadDataFromStorage(storage, logError) {
  try {
    return JSON.parse(getPermanentRaw(storage));
  } catch (readError) {
    logError('Failed to read permanent data:', readError);
    return {};
  }
}

/**
 * Retrieve the raw permanent data string from storage.
 * @param {Storage} storage - Storage used to persist data.
 * @returns {string} Stored data string or '{}'.
 */
function getPermanentRaw(storage) {
  return storage.getItem('permanentData') || '{}';
}

/**
 * Write the permanent data object to storage.
 * @param {Storage} storage - Storage used to persist data.
 * @param {object} data - Data to save.
 * @param {Function} logError - Error logger.
 */
function writePermanentData(storage, data, logError) {
  try {
    storage.setItem('permanentData', JSON.stringify(data));
  } catch (storageError) {
    logError('Failed to persist permanent data:', storageError);
  }
}

/**
 * Persist permanent data when storage is available.
 * @param {Storage} storage - Storage used to persist data.
 * @param {object} data - Data to save.
 * @param {Function} logError - Error logger.
 */
function savePermanentData(storage, data, logError) {
  if (!storage) {
    return;
  }
  writePermanentData(storage, data, logError);
}

export const setLocalPermanentData = (desired, loggers, storage) => {
  const { logError } = loggers;
  validateIncomingPermanentState(desired, logError);

  const storedData = loadPermanentData(storage, logError);
  const updated = { ...storedData, ...desired };
  savePermanentData(storage, updated, logError);

  return updated;
};
