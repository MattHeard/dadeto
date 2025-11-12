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
export function mapConfigToModerationEndpoints(
  config = {},
  defaults = DEFAULT_MODERATION_ENDPOINTS
) {
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
  options = {}
) {
  const defaults = resolveModerationDefaults(options);
  return loadModerationEndpointsSafely(
    loadStaticConfigFn,
    defaults,
    options.logger
  );
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
 * Resolve moderation endpoints when the loader is configured; fall back to defaults otherwise.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader that fetches overrides.
 * @param {{
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 * }} defaults - Default endpoint map when overrides are unavailable.
 * @param {{ error?: (message: string, error?: unknown) => void } | undefined} logger - Logger reporting failures.
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
 * @param {{ error?: (message: string, error?: unknown) => void } | undefined} logger - Logger that reports failures.
 * @returns {Promise<{ getModerationVariantUrl: string, assignModerationJobUrl: string, submitModerationRatingUrl: string }>} Promise resolving to normalized endpoint URLs.
 */
async function loadModerationEndpoints(loadStaticConfigFn, defaults, logger) {
  try {
    const config = await loadStaticConfigFn();
    return mapConfigToModerationEndpoints(config, defaults);
  } catch (error) {
    logModerationEndpointError(logger, error);
    return { ...defaults };
  }
}

/**
 * Report that the moderation endpoints could not be loaded.
 * @param {{ error?: (message: string, error?: unknown) => void } | undefined} logger - Optional logger that will surface the error.
 * @param {unknown} error - Error produced while loading the endpoints.
 * @returns {void}
 */
function logModerationEndpointError(logger, error) {
  const errorLogger = logger?.error ?? (() => {});
  errorLogger(
    'Failed to load moderation endpoints, falling back to defaults.',
    error
  );
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

/**
 *
 * @param loadStaticConfigFn
 * @param root0
 * @param root0.defaults
 * @param root0.logger
 */
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
  let endpointsPromise;

  return function getModerationEndpoints() {
    return (
      endpointsPromise ??
      (endpointsPromise = createModerationEndpointsPromise(loadStaticConfigFn, {
        defaults,
        logger,
      }))
    );
  };
}
