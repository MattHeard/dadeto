let configPromise;

/**
 * Load the static configuration published alongside the site.
 * Subsequent calls reuse the in-flight or resolved promise.
 * @returns {Promise<Record<string, unknown>>} Parsed configuration.
 */
export function loadStaticConfig() {
  if (!configPromise) {
    configPromise = fetch('/config.json', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to load static config: ${response.status}`);
        }
        return response.json();
      })
      .catch(error => {
        console.warn('Failed to load static config', error);
        return {};
      });
  }
  return configPromise;
}
