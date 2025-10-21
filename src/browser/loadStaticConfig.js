import { parseStaticConfigResponse } from './load-static-config-core.js';

let configPromise;

/**
 * Load the static configuration published alongside the site.
 * Subsequent calls reuse the in-flight or resolved promise.
 * @returns {Promise<Record<string, unknown>>} Parsed configuration.
 */

/**
 * Handle a failed static config fetch by logging and returning an empty config.
 * @param {unknown} error Error thrown during fetch.
 * @returns {Record<string, unknown>} Empty configuration object.
 */
function handleStaticConfigError(error) {
  console.warn('Failed to load static config', error);
  return {};
}

/**
 * Fetch the static configuration JSON from the server.
 * @returns {Promise<Record<string, unknown>>} Promise resolving to parsed config.
 */
function createStaticConfigPromise() {
  return fetch('/config.json', { cache: 'no-store' })
    .then(parseStaticConfigResponse)
    .catch(handleStaticConfigError);
}

/**
 * Load the static configuration, reusing a cached promise on subsequent calls.
 * @returns {Promise<Record<string, unknown>>} Promise resolving to config data.
 */
export function loadStaticConfig() {
  if (!configPromise) {
    configPromise = createStaticConfigPromise();
  }
  return configPromise;
}
