import { createEffectInvocationBoundary } from '../allow-effects.js';


/** Register middleware at the cloud function boundary. */
export function useMiddleware(allowEffects, app, middleware) {
  void allowEffects;
  app.use(middleware);
}

/** Register a POST route at the cloud function boundary. */
export function registerPostRoute(allowEffects, app, path, handler) {
  void allowEffects;
  app.post(path, handler);
}

/** Send an HTTP response from the request boundary. */
export function sendHttpResponse(allowEffects, res, response) {
  void allowEffects;
  const result = res.status(response.status);
  result[response.method](response.body);
}

/** Log an error from the request boundary. */
export function logError(allowEffects, logger, ...args) {
  void allowEffects;
  logger.error(...args);
}

/** Log a warning from the request boundary. */
export function logWarning(allowEffects, logger, ...args) {
  void allowEffects;
  logger.warn?.(...args);
}

/** Build the generate-stats runtime adapters used by the cloud wrapper. */
export function createGenerateStatsEffectAdapters(fetchFn) {
  return {
    fetchFn: (permission, ...args) => fetchFn(...args),
    effectFetchFn: (permission, ...args) => fetchFn(...args),
    bindEffectBoundary: handler =>
      createEffectInvocationBoundary(handler)(),
    useMiddleware,
    registerPostRoute,
    sendHttpResponse,
    logError,
    logWarning,
  };
}
