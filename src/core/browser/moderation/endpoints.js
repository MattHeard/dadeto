export const DEFAULT_MODERATION_ENDPOINTS = {
  getModerationVariantUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-get-moderation-variant',
  assignModerationJobUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-assign-moderation-job',
  submitModerationRatingUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-submit-moderation-rating',
};

/**
 * Resolve a moderation endpoint by checking config overrides first.
 * @param {Record<string, string>} config - Static config overrides grouped by endpoint key.
 * @param {{getModerationVariantUrl: string, assignModerationJobUrl: string, submitModerationRatingUrl: string}} defaults - Default endpoint values.
 * @param {'getModerationVariantUrl'|'assignModerationJobUrl'|'submitModerationRatingUrl'} key - Endpoint key to resolve.
 * @returns {string} Endpoint URL resolved from config or defaults.
 */
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
export function mapConfigToModerationEndpoints(config = {}, defaults) {
  const merged = { ...defaults, ...config };
  return {
    getModerationVariantUrl: merged.getModerationVariantUrl,
    assignModerationJobUrl: merged.assignModerationJobUrl,
    submitModerationRatingUrl: merged.submitModerationRatingUrl,
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
 *   logger?: { error: (message: string, error?: unknown) => void },
 * }} [options] - Optional defaults and logger for error reporting.
 * @returns {Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} Promise resolving to moderation endpoint URLs.
 */
export function createModerationEndpointsPromise(
  loadStaticConfigFn,
  options = {}
) {
  const defaults = resolveModerationDefaults(options);
  const logger = resolveModerationLogger(options.logger);
  return loadModerationEndpointsSafely(loadStaticConfigFn, defaults, logger);
}

/**
 * Normalize the defaults provided via options or fall back to the shared map.
 * @param {{
 *   defaults?: {
 *     getModerationVariantUrl: string,
 *     assignModerationJobUrl: string,
 *     submitModerationRatingUrl: string,
 *   },
 * }} options - Optional overrides for endpoint defaults.
 * @returns {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} Resolved defaults used when no overrides exist.
 */
function resolveModerationDefaults(options) {
  return options.defaults ?? DEFAULT_MODERATION_ENDPOINTS;
}

/**
 * Normalize the resolver that reports endpoint failures.
 * @param {{ error: (message: string, error?: unknown) => void } | undefined} logger Logger provided via options.
 * @returns {{ error: (message: string, error?: unknown) => void }} Logger used for reporting.
 */
function resolveModerationLogger(logger) {
  if (logger) {
    return logger;
  }

  return {
    error(message, error) {
      console.error(message, error);
    },
  };
}

/**
 * Resolve moderation endpoints when the loader is configured; fall back to defaults otherwise.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader that fetches overrides.
 * @param {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Default endpoint map when overrides are unavailable.
 * @param {{ error: (message: string, error?: unknown) => void }} logger - Logger reporting failures.
 * @returns {Promise<{ getModerationVariantUrl: string, assignModerationJobUrl: string, submitModerationRatingUrl: string }>} Promise resolving to either the parsed endpoints or the defaults.
 */
function loadModerationEndpointsSafely(loadStaticConfigFn, defaults, logger) {
  if (typeof loadStaticConfigFn !== 'function') {
    return Promise.resolve({ ...defaults });
  }

  return loadModerationEndpoints(loadStaticConfigFn, defaults, logger);
}

/**
 * Load moderation endpoints via the static config loader, reporting errors when they occur.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader that fetches static config overrides.
 * @param {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Default endpoint map when overrides are missing.
 * @param {{ error: (message: string, error?: unknown) => void }} logger - Logger that reports failures.
 * @returns {Promise<{ getModerationVariantUrl: string, assignModerationJobUrl: string, submitModerationRatingUrl: string }>} Promise resolving to normalized endpoint URLs.
 */
function loadModerationEndpoints(loadStaticConfigFn, defaults, logger) {
  return loadModerationEndpointsUnsafe(loadStaticConfigFn, defaults).catch(
    error => handleEndpointFailure(logger, defaults, error)
  );
}

/**
 * Fetch the static config and turn it into endpoint URLs.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for the config.
 * @param {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Defaults used when the loader doesn't override the entries.
 * @returns {Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} Promise resolving to the normalized endpoint URLs.
 */
async function loadModerationEndpointsUnsafe(loadStaticConfigFn, defaults) {
  const config = await loadStaticConfigFn();
  return mapConfigToModerationEndpoints(config, defaults);
}

/**
 * Handle failures when loading moderation endpoints.
 * @param {{ error: (message: string, error?: unknown) => void }} logger - Logger used to report the error.
 * @param {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Fallback endpoints used when loading fails.
 * @param {unknown} error - Error reported by the loader.
 * @returns {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} Fallback endpoints applied after a failure.
 */
function handleEndpointFailure(logger, defaults, error) {
  logger.error(
    'Failed to load moderation endpoints, falling back to defaults.',
    error
  );
  return { ...defaults };
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

  /**
   * @type {Promise<{
   *   getModerationVariantUrl: string,
   *   assignModerationJobUrl: string,
   *   submitModerationRatingUrl: string,
    }> | null} */
  let endpointsPromise = null;

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
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Fallback endpoints for the memoized getter.
 * @param {{ error: (message: string, error?: unknown) => void }} logger - Logger used when loading endpoints fails.
 * @returns {() => Promise<{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }>} Memoized moderation endpoints getter.
 */
export function createGetModerationEndpointsFromStaticConfig(
  loadStaticConfigFn,
  defaults,
  logger
) {
  return createGetModerationEndpoints(() =>
    createModerationEndpointsPromise(loadStaticConfigFn, {
      defaults,
      logger,
    })
  );
}
