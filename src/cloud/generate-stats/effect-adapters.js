import { createEffectInvocationBoundary } from '../allow-effects.js';
import {
  bindStartupEffectBoundary,
  initializeFirebaseApp,
  useMiddleware,
} from './startup-effect-adapters.js';
import {
  logError,
  logWarning,
  sendHttpResponse,
} from './request-effect-adapters.js';

export {
  bindStartupEffectBoundary,
  initializeFirebaseApp,
  useMiddleware,
  logError,
  logWarning,
  sendHttpResponse,
};


/** Register a POST route at the cloud function boundary. */
export function registerPostRoute(allowEffects, app, path, handler) {
  void allowEffects;
  app.post(path, handler);
}

/** Build the generate-stats runtime adapters used by the cloud wrapper. */
export function createGenerateStatsEffectAdapters(fetchFn) {
  return {
    fetchFn: (permission, ...args) => fetchFn(...args),
    effectFetchFn: (permission, ...args) => fetchFn(...args),
    bindEffectBoundary: handler =>
      createEffectInvocationBoundary(handler)(),
    bindStartupEffectBoundary,
    initializeFirebaseAppEffect: initializeFirebaseApp,
    useMiddleware,
    registerPostRoute,
    sendHttpResponse,
    logError,
    logWarning,
  };
}
