/**
 * @typedef {{getModerationVariantUrl: string, assignModerationJobUrl: string, submitModerationRatingUrl: string}} ModerationEndpoints
 * @typedef {{error: (message: string, error?: unknown) => void}} EndpointLogger
 */
export const DEFAULT_MODERATION_ENDPOINTS = {
  getModerationVariantUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-get-moderation-variant',
  assignModerationJobUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-assign-moderation-job',
  submitModerationRatingUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-submit-moderation-rating',
};

/**
 * Select the three moderation URLs after applying explicit config overrides.
 * @param {Record<string, string>} config Static configuration.
 * @param {ModerationEndpoints} defaults Fallback URLs.
 * @returns {ModerationEndpoints} Selected endpoint values.
 */
export function mapConfigToModerationEndpoints(config = {}, defaults) {
  const merged = { ...defaults, ...config };
  return {
    getModerationVariantUrl: merged.getModerationVariantUrl,
    assignModerationJobUrl: merged.assignModerationJobUrl,
    submitModerationRatingUrl: merged.submitModerationRatingUrl,
  };
}

/**
 * Load configuration or return an independent fallback when no loader exists.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn Configuration loader.
 * @param {{defaults?: ModerationEndpoints, logger?: EndpointLogger}} [options] Endpoint dependencies.
 * @returns {Promise<ModerationEndpoints>} Loaded endpoints or fallback values.
 */
export function createModerationEndpointsPromise(
  loadStaticConfigFn,
  options = {}
) {
  const defaults = options.defaults ?? DEFAULT_MODERATION_ENDPOINTS;
  const logger = options.logger || {
    error(message, error) {
      console.error(message, error);
    },
  };
  if (typeof loadStaticConfigFn !== 'function') {
    return Promise.resolve({ ...defaults });
  }
  return loadModerationEndpoints(loadStaticConfigFn, defaults, logger);
}

/**
 * Keep loader and mapping failures inside the same reported fallback boundary.
 * @param {() => Promise<Record<string, string>>} loader Configuration source.
 * @param {ModerationEndpoints} defaults Fallback URLs.
 * @param {EndpointLogger} logger Failure reporter.
 * @returns {Promise<ModerationEndpoints>} Loaded URLs or independent fallback.
 */
async function loadModerationEndpoints(loader, defaults, logger) {
  try {
    return mapConfigToModerationEndpoints(await loader(), defaults);
  } catch (error) {
    logger.error(
      'Failed to load moderation endpoints, falling back to defaults.',
      error
    );
    return { ...defaults };
  }
}

/**
 * Memoize the exact promise returned by an endpoint factory.
 * @param {() => Promise<ModerationEndpoints>} createEndpointsPromiseFn Endpoint factory.
 * @returns {() => Promise<ModerationEndpoints>} Stable promise getter.
 */
export function createGetModerationEndpoints(createEndpointsPromiseFn) {
  if (typeof createEndpointsPromiseFn !== 'function') {
    throw new TypeError('createEndpointsPromiseFn must be a function');
  }
  /** @type {Promise<ModerationEndpoints> | null} */
  let endpointsPromise = null;
  return function getModerationEndpoints() {
    if (!endpointsPromise) {
      endpointsPromise = createEndpointsPromiseFn();
    }
    return endpointsPromise;
  };
}

/**
 * Bind static configuration dependencies to the memoized endpoint getter.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn Configuration loader.
 * @param {ModerationEndpoints} defaults Fallback URLs.
 * @param {EndpointLogger} logger Failure reporter.
 * @returns {() => Promise<ModerationEndpoints>} Memoized configured getter.
 */
export function createGetModerationEndpointsFromStaticConfig(
  loadStaticConfigFn,
  defaults,
  logger
) {
  return createGetModerationEndpoints(() =>
    createModerationEndpointsPromise(loadStaticConfigFn, { defaults, logger })
  );
}
