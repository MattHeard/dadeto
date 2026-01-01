import { deepClone } from './browser-core.js';
import { isNonNullObject } from '../commonCore.js';
import { guardThen } from './common.js';
import { createLocalStorageLens } from './localStorageLens.js';
import { createMemoryStorageLens } from './memoryStorageLens.js';

/**
 * Returns a Base64 encoding function using the provided helpers.
 * @param {Function} btoa - Platform `btoa`.
 * @param {Function} encodeURIComponentFn - Platform `encodeURIComponent`.
 * @returns {Function} encodeBase64 - Encodes a string to Base64.
 */
export function getEncodeBase64(btoa, encodeURIComponentFn) {
  /**
   * Convert percent-encoded segments back into binary characters.
   * @param {string} str - Input string to convert.
   * @returns {string} Binary-friendly representation.
   */
  const toBinary = str =>
    encodeURIComponentFn(str).replace(
      /%([0-9A-F]{2})/g,
      /**
       * @param {string} _match - Matched percent-encoded sequence.
       * @param {string} hex - Captured hexadecimal digits.
       * @returns {string} Single character produced from the decoded bytes.
       */
      (_match, hex) => String.fromCharCode(parseInt(hex, 16))
    );

  /**
   * Base64 encode the provided text.
   * @param {string} str - Text to encode.
   * @returns {string} Base64 string.
   */
  const encodeBase64 = str => btoa(toBinary(str));

  return encodeBase64;
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
 * @property {Storage | null | undefined} [storage] - Optional storage implementation for permanent state.
 * @property {import('./storageLens.js').StorageLens} [memoryLens] - Optional lens for memory storage.
 * @property {import('./storageLens.js').StorageLens} [permanentLens] - Optional lens for permanent storage.
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
 * @property {import('./storageLens.js').StorageLens | null} memoryLens - Lens for memory storage or null.
 * @property {import('./storageLens.js').StorageLens | null} permanentLens - Lens for permanent storage or null.
 */

/**
 * @typedef {object} NormalizedBlogDataLoggers
 * @property {BlogLogFn} logInfo - Guaranteed info-level logger.
 * @property {BlogLogFn} logError - Guaranteed error-level logger.
 * @property {BlogLogFn} logWarning - Guaranteed warning logger (no-op when not supplied).
 */

/**
 * @typedef {object} BlogDataController
 * @property {(state: BlogStateRecord) => Promise<unknown>} fetchAndCacheBlogData - Starts a blog data fetch and caches the result.
 * @property {(state: BlogStateRecord) => Record<string, unknown>} getData - Returns a sanitized snapshot of the current state.
 * @property {(state: TemporaryStateBundle) => void} setLocalTemporaryData - Persists temporary blog state locally.
 * @property {(desired: Record<string, unknown>) => object} setLocalPermanentData - Persists permanent blog state locally.
 * @property {() => object} getLocalPermanentData - Reads persistent blog state.
 */

/**
 * @typedef {Record<string, unknown> & {
 *   blogStatus?: string,
 *   blogError?: unknown,
 *   blogFetchPromise?: Promise<unknown> | null | undefined,
 *   blog?: unknown,
 * }} BlogStateRecord
 * @property {string | undefined} blogStatus - Current blog load status flag.
 * @property {unknown} blogError - Stored error when a fetch fails.
 * @property {Promise<unknown> | null | undefined} blogFetchPromise - Active fetch promise when loading.
 * @property {unknown} blog - Cached blog data.
 */

/**
 * @typedef {object} TemporaryStateBundle
 * @property {Record<string, unknown>} desired - Incoming temporary state object.
 * @property {BlogStateRecord} current - Existing application state to modify.
 */

/**
 * @typedef {object} BlogStateSnapshot
 * @property {string | undefined} status - Normalized blog status.
 * @property {unknown} error - Stored fetch error.
 * @property {Promise<unknown> | null | undefined} fetchPromise - Existing fetch promise.
 * @property {unknown} data - Blog payload.
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
 * @param {BlogStateRecord} globalState - The application state object.
 * @returns {BlogStateSnapshot} Blog-specific state fields.
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
 * @param {BlogStateRecord} globalState - The application state.
 * @returns {boolean} True if a fetch promise is active.
 */
function isFetchInProgress(globalState) {
  const { status, fetchPromise } = getBlogState(globalState);
  return status === BLOG_STATUS.LOADING && Boolean(fetchPromise);
}

/**
 * Checks if a blog fetch is already in progress.
 * @param {BlogStateRecord} globalState - The application state.
 * @param {BlogLogFn} logFn - Logging function used when fetch is active.
 * @returns {boolean} True if a fetch is already running.
 */
export function shouldUseExistingFetch(globalState, logFn) {
  return guardThen(isFetchInProgress(globalState), () => {
    logFn('Blog data fetch already in progress.');
  });
}

/**
 * Returns the active fetch promise when a blog fetch is already running.
 * @param {BlogStateRecord} state - The global state object.
 * @param {BlogLogFn} logInfo - Logger used to report active fetches.
 * @returns {Promise<unknown> | null} The promise if a fetch is running, otherwise null.
 */
function getActiveBlogFetch(state, logInfo) {
  if (!isFetchInProgress(state)) {
    return null;
  }

  logInfo('Blog data fetch already in progress.');
  const { blogFetchPromise: activeFetch } = state;
  return ensureActiveFetchPromise(activeFetch);
}

/**
 * Ensures an active fetch promise is present when the fetch state is loading.
 * @param {Promise<unknown> | null | undefined} maybePromise - Candidate promise.
 * @returns {Promise<unknown>} Confirmed fetch promise.
 */
function ensureActiveFetchPromise(maybePromise) {
  if (!maybePromise) {
    throw new Error(
      'Blog fetch marked as in progress without an active promise.'
    );
  }

  return maybePromise;
}

/**
 * Wrapper for blog-data fetching that accepts an injected dependency bundle.
 * @param {BlogStateRecord} state - The global state object.
 * @param {BlogDataDependencies} dependencies - Injected fetch + logger bundle.
 * @returns {Promise<unknown>} Promise resolving when fetch completes.
 */
export function fetchAndCacheBlogData(state, dependencies) {
  const { fetch, loggers } = dependencies;
  const { logInfo, logError } = loggers;

  // Prevent multiple simultaneous fetches
  const activeFetch = getActiveBlogFetch(state, logInfo);
  if (activeFetch) {
    return activeFetch;
  }

  const blogUrl = BLOG_DATA_URL;

  logInfo('Starting to fetch blog data...');
  state.blogStatus = BLOG_STATUS.LOADING;
  state.blogError = null;

  const fetchPromise = fetch(blogUrl)
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

  state.blogFetchPromise = fetchPromise;
  return fetchPromise;
}

/**
 * Creates a deep copy of the provided state.
 * @param {Record<string, unknown>} globalState - The state to copy.
 * @returns {Record<string, unknown>} A cloned version of the state.
 */
export const getDeepStateCopy = globalState => deepClone(globalState);

/**
 * Removes internal bookkeeping fields from a state copy.
 * @param {BlogStateRecord} stateCopy - State object to sanitize.
 */
function stripInternalFields(stateCopy) {
  for (const key of INTERNAL_STATE_KEYS) {
    delete stateCopy[key];
  }
}

/**
 * Restores blog-related properties on the global state object.
 * @param {BlogStateRecord} globalState - The global application state.
 * @param {BlogStateSnapshot} blogState - Previously saved blog data.
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
  return Object.prototype.hasOwnProperty.call(obj, 'temporary');
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
 * @param {BlogStateRecord} state - The global state object.
 * @returns {boolean} True when status is IDLE.
 */
function isIdleStatus(state) {
  return getBlogState(state).status === BLOG_STATUS.IDLE;
}

/**
 * Triggers the provided fetch when the blog status is idle.
 * @param {BlogStateRecord} state - Global state.
 * @param {() => void} fetch - Blog fetch function.
 */
function tryFetchingBlog(state, fetch) {
  if (isIdleStatus(state)) {
    fetch();
  }
}

/**
 * Logs any stored fetch error when present.
 * @param {BlogStateRecord} state - Global state object.
 * @param {BlogLogFn} logWarning - Warning logger.
 */
function maybeLogFetchError(state, logWarning) {
  const blogState = getBlogState(state);
  if (blogState.status === BLOG_STATUS.ERROR) {
    logWarning('Blog data previously failed to load:', blogState.error);
  }
}

/**
 * Handles fetch-related state transitions and logging.
 * @param {BlogStateRecord} state - Global state to update.
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
 * @param {string | undefined} status - Current blog status.
 * @returns {boolean} Whether a deep clone should be made.
 */
function shouldDeepCopyForFetch(status) {
  return status === 'idle' || status === 'error';
}

/**
 * Provides either the original state or a deep copy depending on status.
 * @param {BlogStateRecord} state - Global application state.
 * @returns {BlogStateRecord} State or a deep clone when needed.
 */
function getRelevantStateCopy(state) {
  const status = state.blogStatus;
  if (shouldDeepCopyForFetch(status)) {
    return /** @type {BlogStateRecord} */ (deepClone(state));
  }
  return state;
}

/**
 * Gets a deep copy of the current global state, suitable for passing to toys.
 * It also handles initiating the blog data fetch if needed.
 * @param {BlogStateRecord} state - The main application state.
 * @param {BlogDataDependencies} dependencies - Injected fetch + logger bundle.
 * @returns {Record<string, unknown>} A deep copy of the relevant state for the toy.
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
 * @param {TemporaryStateBundle} state - Contains desired and current state objects.
 * @param {BlogDataLoggers} loggers - Logging functions.
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
 * @param {Record<string, unknown>} desired - The new state object.
 * @param {BlogDataLoggers} loggers - Logging functions.
 * @param {BlogLogFn} loggers.logError - Error logger.
 * @param {Storage | null | undefined} [storage] - Storage used to persist data.
 * @returns {object} The merged permanent state.
 */

/**
 * Load existing permanent data from storage.
 * @param {import('./storageLens.js').StorageLens | null} permanentLens - Lens for permanent storage.
 * @returns {object} Stored data object.
 */
function loadPermanentData(permanentLens) {
  if (!permanentLens) {
    return {};
  }
  return loadDataFromLens(permanentLens);
}

/**
 * Read the stored permanent data.
 * @param {import('./storageLens.js').StorageLens | null} permanentLens - Lens for permanent storage.
 * @returns {object} Stored permanent data (or empty object on failure).
 */
function readLocalPermanentData(permanentLens) {
  return loadPermanentData(permanentLens);
}

/**
 * Read data from a lens.
 * @param {import('./storageLens.js').StorageLens} lens - Storage lens.
 * @returns {object} Stored data object.
 */
function loadDataFromLens(lens) {
  const data = lens.get('permanentData');
  return data || {};
}

/**
 * Persist permanent data using a lens.
 * @param {import('./storageLens.js').StorageLens | null} permanentLens - Lens for permanent storage.
 * @param {object} data - Data to save.
 */
function savePermanentData(permanentLens, data) {
  if (!permanentLens) {
    return;
  }
  permanentLens.set('permanentData', data);
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

  const { fetch: fetchImpl, loggers, storage, memoryLens, permanentLens } = bundle;

  ensureFetchFunction(fetchImpl);
  ensureLoggersObject(loggers);

  const normalizedLoggers = createNormalizedLoggers(loggers);
  const normalizedStorage = storage ?? null;

  const finalMemoryLens = memoryLens ?? createMemoryStorageLens();
  const finalPermanentLens = permanentLens ?? createLensFromStorage(normalizedStorage, normalizedLoggers.logError);

  return {
    fetch: fetchImpl,
    loggers: normalizedLoggers,
    storage: normalizedStorage,
    memoryLens: finalMemoryLens,
    permanentLens: finalPermanentLens,
  };
}

/**
 * Creates a storage lens from a legacy storage object.
 * @param {Storage | null} storage - Browser storage implementation.
 * @param {BlogLogFn} logError - Error logger.
 * @returns {import('./storageLens.js').StorageLens | null} Storage lens or null.
 */
function createLensFromStorage(storage, logError) {
  if (!storage) {
    return null;
  }
  return createLocalStorageLens({ storage, logError });
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

  /** @type {NormalizedBlogDataDependencies | undefined} */
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
    /**
     * @param {BlogStateRecord} state - Current blog state that will be updated.
     * @returns {Promise<unknown>} Resolves once the fetch and cache operations complete.
     */
    fetchAndCacheBlogData(state) {
      return fetchAndCacheBlogData(state, getDependencies());
    },
    /**
     * @param {BlogStateRecord} state - Application state used to build the data view.
     * @returns {Record<string, unknown>} Sanitized copy of the current state.
     */
    getData(state) {
      return getData(state, getDependencies());
    },
    /**
     * @param {TemporaryStateBundle} state - Incoming temporary payload and the target state.
     * @returns {void} No value is returned; the state is modified in place.
     */
    setLocalTemporaryData(state) {
      const { loggers } = getDependencies();
      return setLocalTemporaryData(state, loggers);
    },
    /**
     * @param {Record<string, unknown>} desired - Desired permanent values to persist.
     * @returns {object} Merged permanent state after persistence.
     */
    setLocalPermanentData(desired) {
      const { loggers, permanentLens } = getDependencies();
      return setLocalPermanentDataCore(desired, loggers, permanentLens);
    },
    getLocalPermanentData() {
      const { permanentLens } = getDependencies();
      return readLocalPermanentData(permanentLens);
    },
  };
}

/**
 * Persist the merged permanent state to storage.
 * @param {Record<string, unknown>} desired - Desired permanent state.
 * @param {BlogDataLoggers} loggers - Logging helpers.
 * @param {import('./storageLens.js').StorageLens | null} permanentLens - Lens for permanent storage.
 * @returns {object} Merged permanent state object.
 */
const setLocalPermanentDataCore = (desired, loggers, permanentLens) => {
  const { logError } = loggers;
  validateIncomingPermanentState(desired, logError);

  const storedData = loadPermanentData(permanentLens);
  const updated = { ...storedData, ...desired };
  savePermanentData(permanentLens, updated);

  return updated;
};

/**
 * Exported wrapper for backward compatibility with storage-based API.
 * @param {Record<string, unknown>} desired - Desired permanent state.
 * @param {BlogDataLoggers} loggers - Logging helpers.
 * @param {Storage | null | undefined} storage - Storage used to persist data.
 * @returns {object} Merged permanent state object.
 */
export const setLocalPermanentData = (desired, loggers, storage) => {
  const lens = createLensFromStorage(storage ?? null, loggers.logError);
  return setLocalPermanentDataCore(desired, loggers, lens);
};

/**
 * Exported wrapper for backward compatibility with storage-based API.
 * @param {BlogDataLoggers} loggers - Logging helpers.
 * @param {Storage | null | undefined} storage - Storage implementation to read from.
 * @returns {object} Stored permanent data (or empty object on failure).
 */
export const getLocalPermanentData = (loggers, storage) => {
  const lens = createLensFromStorage(storage ?? null, loggers.logError);
  return readLocalPermanentData(lens);
};
