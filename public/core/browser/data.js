import { deepClone } from './browser-core.js';
import { isNonNullObject } from '../commonCore.js';
import { guardThen } from './common.js';

/**
 * Returns a Base64 encoding function using the provided helpers.
 * @param {Function} btoa - Platform `btoa`.
 * @param {Function} encodeURIComponentFn - Platform `encodeURIComponent`.
 * @returns {Function} encodeBase64 - Encodes a string to Base64.
 */
export function getEncodeBase64(btoa, encodeURIComponentFn) {
  const toBinary = str =>
    encodeURIComponentFn(str).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  return str => btoa(toBinary(str));
}

/**
 * @typedef {(message: string, ...meta: unknown[]) => void} BlogLogFn
 */

/**
 * @typedef {object} BlogDataLoggers
 * @property {BlogLogFn} logInfo - Info level logger.
 * @property {BlogLogFn} logError - Error level logger.
 * @property {BlogLogFn} [logWarning] - Optional warning logger.
 */

/**
 * @typedef {object} BlogDataDependencies
 * @property {typeof fetch} fetch - Fetch implementation used to retrieve blog data.
 * @property {BlogDataLoggers} loggers - Logger bundle injected by the entry layer.
 * @property {Storage} [storage] - Optional storage implementation for permanent state.
 */

/**
 * @typedef {object} NormalizedBlogDataDependencies
 * @property {typeof fetch} fetch - Fetch implementation used to retrieve blog data.
 * @property {{
 *   logInfo: BlogLogFn,
 *   logError: BlogLogFn,
 *   logWarning: BlogLogFn,
 * }} loggers - Logger bundle with guaranteed callable members.
 * @property {Storage | null} storage - Storage implementation or null when unavailable.
 */

/**
 * @typedef {object} NormalizedBlogDataLoggers
 * @property {BlogLogFn} logInfo - Guaranteed info-level logger.
 * @property {BlogLogFn} logError - Guaranteed error-level logger.
 * @property {BlogLogFn} logWarning - Guaranteed warning logger (no-op when not supplied).
 */

/**
 * @typedef {object} BlogDataController
 * @property {(state: object) => Promise<unknown>} fetchAndCacheBlogData - Starts a blog data fetch and caches the result.
 * @property {(state: object) => object} getData - Returns the current blog data state snapshot.
 * @property {(state: object) => object} setLocalTemporaryData - Persists temporary blog state locally.
 * @property {(desired: object) => object} setLocalPermanentData - Persists permanent blog state locally.
 */

export { deepMerge } from './browser-core.js';

const INTERNAL_STATE_KEYS = ['blogStatus', 'blogError', 'blogFetchPromise'];
const BLOG_DATA_URL = './blog.json';

/**
 * @callback BlogDependencyFactory
 * @returns {BlogDataDependencies}
 */

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
  return guardThen(isFetchInProgress(globalState), () => {
    logFn('Blog data fetch already in progress.');
  });
}

/**
 * Wrapper for blog-data fetching that accepts an injected dependency bundle.
 * @param {object} state - The global state object.
 * @param {BlogDataDependencies} dependencies - Injected fetch + logger bundle.
 * @returns {Promise<unknown>} Promise resolving when fetch completes.
 */
export function fetchAndCacheBlogData(state, dependencies) {
  const { fetch, loggers } = dependencies;
  const { logInfo, logError } = loggers;

  // Prevent multiple simultaneous fetches
  if (isFetchInProgress(state)) {
    logInfo('Blog data fetch already in progress.');
    return state.blogFetchPromise;
  }

  const blogUrl = BLOG_DATA_URL;

  logInfo('Starting to fetch blog data...');
  state.blogStatus = BLOG_STATUS.LOADING;
  state.blogError = null;

  state.blogFetchPromise = fetch(blogUrl)
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
 * @param {BlogDataDependencies} dependencies - Injected fetch + logger bundle.
 */
function handleBlogFetchState(state, dependencies) {
  const { loggers } = dependencies;
  const doFetch = () => fetchAndCacheBlogData(state, dependencies);
  tryFetchingBlog(state, doFetch);
  const { logWarning = () => {} } = loggers;
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
 * @param {BlogDataDependencies} dependencies - Injected fetch + logger bundle.
 * @returns {object} A deep copy of the relevant state for the toy.
 */
export const getData = (state, dependencies) => {
  const stateCopy = getRelevantStateCopy(state);
  handleBlogFetchState(state, dependencies);
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
 * Read the stored permanent data while ensuring the logError helper exists.
 * @param {object} loggers - Logging helpers that must include `logError`.
 * @param {Storage} [storage] - Storage implementation to read from.
 * @returns {object} Stored permanent data (or empty object on failure).
 */
function readLocalPermanentData(loggers, storage) {
  const logError = ensureLoggerFunction(loggers, 'logError');
  return loadPermanentData(storage, logError);
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

/**
 * Ensure a logger entry exists and is callable.
 * @param {BlogDataLoggers} loggers - Logger bundle supplied by the dependency factory.
 * @param {'logInfo'|'logError'|'logWarning'} key - Logger key that must resolve to a function.
 * @returns {BlogLogFn} Callable logger implementation.
 */
function ensureLoggerFunction(loggers, key) {
  const fn = loggers[key];
  if (typeof fn !== 'function') {
    throw new TypeError(
      `createBlogDataController requires loggers.${key} to be a function.`
    );
  }
  return fn;
}

/**
 * Return a safe warning logger when one is supplied, otherwise no-op.
 * @param {BlogDataLoggers} loggers - Logger bundle supplied by the dependency factory.
 * @returns {BlogLogFn} Warning logger that can safely be called.
 */
function createWarningLogger(loggers) {
  if (typeof loggers.logWarning === 'function') {
    return loggers.logWarning;
  }

  return () => {};
}
/**
 * Normalize the dependency bundle returned by the factory.
 * @param {BlogDataDependencies} bundle - Raw dependencies returned by the factory.
 * @returns {NormalizedBlogDataDependencies} Sanitized dependency bundle.
 */
function normalizeDependencies(bundle) {
  ensureBundleObject(bundle);

  const { fetch: fetchImpl, loggers, storage } = bundle;

  ensureFetchFunction(fetchImpl);
  ensureLoggersObject(loggers);

  const normalizedLoggers = createNormalizedLoggers(loggers);

  return {
    fetch: fetchImpl,
    loggers: normalizedLoggers,
    storage: storage ?? null,
  };
}

/**
 * Ensure the dependency bundle is an object.
 * @param {*} bundle - Candidate dependency bundle.
 * @returns {void}
 */
function ensureBundleObject(bundle) {
  if (!isNonNullObject(bundle)) {
    throw new TypeError(
      'createBlogDataController expected createDependencies to return an object.'
    );
  }
}

/**
 * Ensure the fetch implementation is defined as a function.
 * @param {*} fetchImpl - Candidate fetch implementation.
 * @returns {void}
 */
function ensureFetchFunction(fetchImpl) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError(
      'createBlogDataController requires fetch to be provided as a function.'
    );
  }
}

/**
 * Ensure loggers are supplied as an object.
 * @param {*} loggers - Candidate logger bundle.
 * @returns {void}
 */
function ensureLoggersObject(loggers) {
  if (!isNonNullObject(loggers)) {
    throw new TypeError(
      'createBlogDataController requires loggers to be an object with logging functions.'
    );
  }
}

/**
 * Build the normalized logger helpers used by the controller.
 * @param {BlogDataLoggers} loggers - Logger implementations provided by dependencies.
 * @returns {NormalizedBlogDataLoggers} Sanitized logger collection.
 */
function createNormalizedLoggers(loggers) {
  return {
    logInfo: ensureLoggerFunction(loggers, 'logInfo'),
    logError: ensureLoggerFunction(loggers, 'logError'),
    logWarning: createWarningLogger(loggers),
  };
}

/**
 * Cache dependency bundle creation so shared helpers reuse instances.
 * @param {BlogDependencyFactory} createDependencies - Factory that resolves runtime dependencies.
 * @returns {() => NormalizedBlogDataDependencies} Function that lazily resolves normalized dependencies.
 */
function createDependencyAccessor(createDependencies) {
  if (typeof createDependencies !== 'function') {
    throw new TypeError(
      'createBlogDataController expects a dependency factory function.'
    );
  }

  let cachedDependencies;
  return () => {
    if (!cachedDependencies) {
      cachedDependencies = normalizeDependencies(createDependencies());
    }
    return cachedDependencies;
  };
}

/**
 * Build a blog data controller that wires helpers to the provided dependencies.
 * @param {BlogDependencyFactory} createDependencies - Dependency factory invoked on first use.
 * @returns {BlogDataController} Controller API used by the entry layer.
 */
export function createBlogDataController(createDependencies) {
  const getDependencies = createDependencyAccessor(createDependencies);

  return {
    fetchAndCacheBlogData(state) {
      return fetchAndCacheBlogData(state, getDependencies());
    },
    getData(state) {
      return getData(state, getDependencies());
    },
    setLocalTemporaryData(state) {
      const { loggers } = getDependencies();
      return setLocalTemporaryData(state, loggers);
    },
    setLocalPermanentData(desired) {
      const { loggers, storage } = getDependencies();
      return setLocalPermanentDataCore(desired, loggers, storage);
    },
    getLocalPermanentData() {
      const { loggers, storage } = getDependencies();
      return readLocalPermanentData(loggers, storage);
    },
  };
}

const setLocalPermanentDataCore = (desired, loggers, storage) => {
  const { logError } = loggers;
  validateIncomingPermanentState(desired, logError);

  const storedData = loadPermanentData(storage, logError);
  const updated = { ...storedData, ...desired };
  savePermanentData(storage, updated, logError);

  return updated;
};

export const setLocalPermanentData = setLocalPermanentDataCore;
export const getLocalPermanentData = readLocalPermanentData;
