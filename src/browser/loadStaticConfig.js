import { parseStaticConfigResponse } from '../core/browser/load-static-config-core.js';

let configPromise;

/**
 * Load the static configuration published alongside the site.
 * Subsequent calls reuse the in-flight or resolved promise.
 * @returns {Promise<Record<string, unknown>>} Parsed configuration.
 */

function handleStaticConfigError(error) {
  console.warn('Failed to load static config', error);
  return {};
}

function createStaticConfigPromise() {
  return fetch('/config.json', { cache: 'no-store' })
    .then(parseStaticConfigResponse)
    .catch(handleStaticConfigError);
}

export function loadStaticConfig() {
  if (!configPromise) {
    configPromise = createStaticConfigPromise();
  }
  return configPromise;
}
