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
 * Ensure a static config fetch result succeeded before returning it.
 * @param {StaticConfigResponse} response - Raw fetch response.
 * @returns {StaticConfigResponse} The validated response ready for parsing.
 */
/**
 * Check if response is ok.
 * @param {object} response Response.
 * @returns {boolean} True if ok.
 */
function isResponseOk(response) {
  return Boolean(response?.ok);
}

/**
 *
 * @param response
 */
function ensureStaticConfigResponseOk(response) {
  if (isResponseOk(response)) {
    return response;
  }
  throw createStaticConfigError(response);
}

/**
 * Build an error message when the static config fetch fails.
 * @param {StaticConfigResponse | null | undefined} response - Response that triggered the error.
 * @returns {Error} Error describing why the fetch failed.
 */
/**
 * Get status from response.
 * @param {object} response Response.
 * @returns {string | number} Status.
 */
function getStatusFromResponse(response) {
  return response?.status ?? 'unknown';
}

/**
 *
 * @param response
 */
function createStaticConfigError(response) {
  const status = getStatusFromResponse(response);
  return new Error(`Failed to load static config: ${status}`);
}

/**
 * Create a memoized static config loader using injected dependencies.
 * @param {LoadStaticConfigDependencies} [options] - Dependency bundle for the loader.
 * @returns {() => Promise<Record<string, unknown>>} Static config loader.
 */
export function createLoadStaticConfig({ fetchFn, warn } = {}) {
  ensureFetchFunction(fetchFn);
  const logWarn = resolveLogWarn(warn);
  return createStaticConfigLoader(fetchFn, logWarn);
}

/**
 * Validate that the injected fetch helper is callable.
 * @param {(input: string, init?: Record<string, unknown>) => Promise<StaticConfigResponse>} fetchFn - Fetch-like function.
 * @returns {void}
 */
function ensureFetchFunction(fetchFn) {
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }
}

/**
 * Ensure a warning logger is available, defaulting to no-op.
 * @param {(message: string, error?: unknown) => void | undefined} warn - Optional logger dependency.
 * @returns {(message: string, error?: unknown) => void} Logger invoked when static config loading fails.
 */
function resolveLogWarn(warn) {
  if (typeof warn === 'function') {
    return warn;
  }

  return () => {};
}

/**
 * Build a memoized loader that parses the remote static config once.
 * @param {(input: string, init?: Record<string, unknown>) => Promise<StaticConfigResponse>} fetchFn - Network helper that retrieves config.
 * @param {(message: string, error?: unknown) => void} logWarn - Logger used when loading fails.
 * @returns {() => Promise<Record<string, unknown>>} Loader that returns the cached payload.
 */
function createStaticConfigLoader(fetchFn, logWarn) {
  let configPromise;

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
