let configPromise;

/**
 * Load the static configuration published alongside the site.
 * Subsequent calls reuse the in-flight or resolved promise.
 * @returns {Promise<Record<string, unknown>>} Parsed configuration.
 */
async function parseStaticConfigResponse(response) {
  if (!response.ok) {
    throw new Error(`Failed to load static config: ${response.status}`);
  }
  return response.json();
}

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
