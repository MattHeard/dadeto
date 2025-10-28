/**
 * Parse the static config fetch response, enforcing a successful status.
 * @param {Response} response - Fetch response for the config.json request.
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
 * @param {{
 *   fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
 *   warn?: (message: string, error?: unknown) => void,
 * }} options - Dependency bundle for the loader.
 * @returns {() => Promise<Record<string, unknown>>} Static config loader.
 */
export function createLoadStaticConfig({ fetchFn, warn } = {}) {
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

  const logWarn = typeof warn === 'function' ? warn : () => {};
  let configPromise;

  function handleStaticConfigError(error) {
    logWarn('Failed to load static config', error);
    return {};
  }

  function createStaticConfigPromise() {
    return fetchFn('/config.json', { cache: 'no-store' })
      .then(parseStaticConfigResponse)
      .catch(handleStaticConfigError);
  }

  return function loadStaticConfig() {
    if (!configPromise) {
      configPromise = createStaticConfigPromise();
    }

    return configPromise;
  };
}
