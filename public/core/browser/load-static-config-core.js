import { functionOrFallback } from '../commonCore.js';

/**
 * @typedef {object} StaticConfigResponse
 * @property {boolean} ok Indicates whether the request succeeded.
 * @property {number} [status] HTTP status code from the response.
 * @property {() => Promise<Record<string, unknown>>} json Function returning the parsed JSON payload.
 */

/**
 * @typedef {object} LoadStaticConfigDependencies
 * @property {(input: string, init?: Record<string, unknown>) => Promise<StaticConfigResponse>} fetchFn
 *   Fetch-like function used to retrieve the static configuration.
 * @property {(message: string, error?: unknown) => void} [warn]
 *   Optional logger invoked when the configuration fails to load.
 */

/**
 * Parse the static config fetch response, ensuring a successful status.
 * @param {StaticConfigResponse} response - Fetch response for the config.json request.
 * @returns {Promise<Record<string, unknown>>} Promise resolving to the parsed config payload.
 */
export async function parseStaticConfigResponse(response) {
  return ensureStaticConfigResponseOk(response).json();
}

/**
 * Determine whether the static config response succeeded.
 * @param {StaticConfigResponse | null | undefined} response - Raw response from config fetch.
 * @returns {boolean} `true` when the fetch reported an OK response.
 */
function isResponseOk(response) {
  return Boolean(response?.ok);
}

/**
 * Ensure a static config fetch result succeeded before returning it.
 * @param {StaticConfigResponse} response - Raw fetch response for the config request.
 * @returns {StaticConfigResponse} The validated response ready for parsing.
 */
function ensureStaticConfigResponseOk(response) {
  if (isResponseOk(response)) {
    return response;
  }
  throw createStaticConfigError(response);
}

/**
 * Build an error describing why static config was not retrieved.
 * @param {StaticConfigResponse | null | undefined} response Response that triggered the error.
 * @returns {Error} Error describing why the fetch failed.
 */
function createStaticConfigError(response) {
  const status = resolveStaticConfigStatus(response);
  return new Error(`Failed to load static config: ${status}`);
}

/**
 * Resolve the HTTP status code exposed by the fetch response.
 * @param {StaticConfigResponse | null | undefined} response Response that issued the status.
 * @returns {StaticConfigResponse['status'] | 'unknown'} Status code or `'unknown'` when unavailable.
 */
function resolveStaticConfigStatus(response) {
  if (!response || response.status === undefined) {
    return 'unknown';
  }

  return response.status;
}

/**
 * Create a memoized static config loader using injected dependencies.
 * @param {LoadStaticConfigDependencies} [options] - Dependency bundle for the loader.
 * @returns {() => Promise<Record<string, unknown>>} Static config loader.
 */
export function createLoadStaticConfig(options) {
  const { fetchFn, warn } = options ?? {};
  ensureFetchFunction(fetchFn);
  const logWarn = resolveLogWarn(warn);
  return createStaticConfigLoader(fetchFn, logWarn);
}

/**
 * Validate that the injected fetch helper is callable.
 * @param {unknown} fetchFn - Candidate fetch helper.
 * @returns {asserts fetchFn is (input: string, init?: Record<string, unknown>) => Promise<StaticConfigResponse>} Guarantees the helper is callable.
 */
function ensureFetchFunction(fetchFn) {
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }
}

/**
 * Ensure a warning logger is available, defaulting to no-op.
 * @param {((message: string, error?: unknown) => void) | undefined} warn - Optional logger dependency.
 * @returns {(message: string, error?: unknown) => void} Logger invoked when static config loading fails.
 */
function resolveLogWarn(warn) {
  const fallbackLogger =
    () =>
    /**
     * @param {string} message
     * @param {unknown} [error]
     */
    (message, error) => {
      void message;
      void error;
    };
  return /** @type {(message: string, error?: unknown) => void} */ (
    functionOrFallback(warn, fallbackLogger)
  );
}

/**
 * Build a memoized loader that parses the remote static config once.
 * @param {(input: string, init?: Record<string, unknown>) => Promise<StaticConfigResponse>} fetchFn - Network helper that retrieves config.
 * @param {(message: string, error?: unknown) => void} logWarn - Logger used when loading fails.
 * @returns {() => Promise<Record<string, unknown>>} Loader that returns the cached payload.
 */
function createStaticConfigLoader(fetchFn, logWarn) {
  /** @type {Promise<Record<string, unknown>> | null} */
  let configPromise = null;

  /**
   * Log failures and fall back to an empty payload.
   * @param {unknown} error - Issue encountered while fetching config.
   * @returns {Record<string, unknown>} Empty fallback config.
   */
  function handleStaticConfigError(error) {
    logWarn('Failed to load static config', error);
    return {};
  }

  /**
   * Kick off the static config fetch and parse pipeline.
   * @returns {Promise<Record<string, unknown>>} Promise resolving to the parsed payload.
   */
  function createStaticConfigPromise() {
    return fetchFn('/config.json', { cache: 'no-store' })
      .then(parseStaticConfigResponse)
      .catch(handleStaticConfigError);
  }

  return function loadStaticConfig() {
    return configPromise || (configPromise = createStaticConfigPromise());
  };
}
