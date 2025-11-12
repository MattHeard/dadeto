export const DEFAULT_MODERATION_ENDPOINTS = {
  getModerationVariantUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-get-moderation-variant',
  assignModerationJobUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-assign-moderation-job',
  submitModerationRatingUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-submit-moderation-rating',
};

/**
 *
 * @param config
 * @param defaults
 * @param key
 */
function resolveEndpointValue(config, defaults, key) {
  return config?.[key] ?? defaults[key];
}

/**
 * Map a static config object into moderation endpoints with defaults.
 * @param {Record<string, string>} config - Static config values keyed by endpoint name.
 * @param {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Fallback endpoint URLs when config omits a value.
 * @returns {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} Normalized moderation endpoint URLs.
 */
export function mapConfigToModerationEndpoints(
  config,
  defaults = DEFAULT_MODERATION_ENDPOINTS
) {
  return {
    getModerationVariantUrl: resolveEndpointValue(
      config,
      defaults,
      'getModerationVariantUrl'
    ),
    assignModerationJobUrl: resolveEndpointValue(
      config,
      defaults,
      'assignModerationJobUrl'
    ),
    submitModerationRatingUrl: resolveEndpointValue(
      config,
      defaults,
      'submitModerationRatingUrl'
    ),
  };
}

/**
 * Build a promise that resolves moderation endpoints from a loader.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for static config.
 * @param {{
 *   defaults?: {
 *     getModerationVariantUrl: string,
 *     assignModerationJobUrl: string,
 *     submitModerationRatingUrl: string,
 *   },
 *   logger?: { error?: (message: string, error?: unknown) => void },
 * }} [options] - Optional overrides for defaults and logging.
 * @returns {Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} Promise resolving to moderation endpoint URLs.
 */
export function createModerationEndpointsPromise(
  loadStaticConfigFn,
  { defaults = DEFAULT_MODERATION_ENDPOINTS, logger } = {}
) {
  if (typeof loadStaticConfigFn !== 'function') {
    return Promise.resolve({ ...defaults });
  }

  return Promise.resolve()
    .then(() => loadStaticConfigFn())
    .then(config => mapConfigToModerationEndpoints(config, defaults))
    .catch(error => {
      if (logger?.error) {
        logger.error(
          'Failed to load moderation endpoints, falling back to defaults.',
          error
        );
      }

      return { ...defaults };
    });
}

/**
 * Memoize the promise factory that resolves moderation endpoints.
 * @param {() => Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} createEndpointsPromiseFn - Promise factory for moderation endpoints.
 * @returns {() => Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} Memoized moderation endpoints getter.
 */
export function createGetModerationEndpoints(createEndpointsPromiseFn) {
  if (typeof createEndpointsPromiseFn !== 'function') {
    throw new TypeError('createEndpointsPromiseFn must be a function');
  }

  let endpointsPromise;

  return function getModerationEndpoints() {
    if (!endpointsPromise) {
      endpointsPromise = createEndpointsPromiseFn();
    }

    return endpointsPromise;
  };
}

/**
 * Build a memoized moderation endpoints getter backed by the static config loader.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for static config.
 * @param {{
 *   defaults?: {
 *     getModerationVariantUrl: string,
 *     assignModerationJobUrl: string,
 *     submitModerationRatingUrl: string,
 *   },
 *   logger?: { error?: (message: string, error?: unknown) => void },
 * }} [options] - Optional overrides for defaults and logging.
 * @returns {() => Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} Memoized moderation endpoints getter.
 */
export function createGetModerationEndpointsFromStaticConfig(
  loadStaticConfigFn,
  { defaults = DEFAULT_MODERATION_ENDPOINTS, logger } = {}
) {
  return createGetModerationEndpoints(() =>
    createModerationEndpointsPromise(loadStaticConfigFn, {
      defaults,
      logger,
    })
  );
}
