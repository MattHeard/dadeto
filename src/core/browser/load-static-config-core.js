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
 * Parse the static config fetch response, enforcing a successful status.
 * @param {StaticConfigResponse} response - Fetch response for the config.json request.
 * @returns {Promise<Record<string, unknown>>} Parsed configuration payload.
 */
export async function parseStaticConfigResponse(response) {
  if (!response?.ok) {
    const status = response?.status ?? 'unknown';
    throw new Error(`Failed to load static config: ${status}`);
  }

  return response.json();
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

  const logWarn = typeof warn === 'function' ? warn : () => {};
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
