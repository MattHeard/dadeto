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
function ensureStaticConfigResponseOk(response) {
  if (response?.ok) {
    return response;
  }

  throw createStaticConfigError(response);
}

/**
 * Build an error message when the static config fetch fails.
 * @param {StaticConfigResponse | null | undefined} response - Response that triggered the error.
 * @returns {Error} Error describing why the fetch failed.
 */
function createStaticConfigError(response) {
  const status = response?.status ?? 'unknown';
  return new Error(`Failed to load static config: ${status}`);
}

/**
 * Create a memoized static config loader using injected dependencies.
 * @param {LoadStaticConfigDependencies} [options] - Dependency bundle for the loader.
 * @returns {() => Promise<Record<string, unknown>>} Static config loader.
 */
export function createLoadStaticConfig({ fetchFn, warn } = {}) {
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

  let logWarn;
  if (typeof warn === 'function') {
    logWarn = warn;
  } else {
    logWarn = () => {};
  }
  let configPromise;

  /**
   * Handle errors produced while loading the static configuration.
   * @param {unknown} error - Error generated while loading the configuration.
   * @returns {Record<string, unknown>} Empty configuration fallback.
   */
  function handleStaticConfigError(error) {
    logWarn('Failed to load static config', error);
    return {};
  }

  /**
   * Kick off the config fetch request and normalize the resulting promise.
   * @returns {Promise<Record<string, unknown>>} Promise resolving to the config payload.
   */
  function createStaticConfigPromise() {
    return fetchFn('/config.json', { cache: 'no-store' })
      .then(parseStaticConfigResponse)
      .catch(handleStaticConfigError);
  }

  /**
   * Retrieve the memoized static configuration payload.
   * @returns {Promise<Record<string, unknown>>} Promise resolving to the cached config.
   */
  return function loadStaticConfig() {
    if (!configPromise) {
      configPromise = createStaticConfigPromise();
    }

    return configPromise;
  };
}
