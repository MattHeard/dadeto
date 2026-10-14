import { createEffectInvocationBoundary } from '../allow-effects.js';
import { createCloudHttpEndpoint } from '../../core/cloud/http-endpoint-bootstrap.js';

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {{ use: (middleware: unknown) => void }} app @param {unknown} middleware */
export function useSubmitNewStoryMiddleware(allowEffects, app, middleware) {
  void allowEffects;
  app.use(middleware);
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {{ [method: string]: (path: string, handler: unknown) => void }} app @param {{ method: string, path: string, handler: unknown }} route */
export function registerSubmitNewStoryRoute(allowEffects, app, route) {
  void allowEffects;
  app[route.method](route.path, route.handler);
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {{ region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } }} functions @param {unknown} app @param {string} region */
export function registerSubmitNewStoryHttpFunction(
  allowEffects,
  functions,
  app,
  region
) {
  void allowEffects;
  return functions.region(region).https.onRequest(app);
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {(allowEffects: import('../../../types/allow-effects').AllowEffects) => void} ensureFirebaseApp */
export function ensureSubmitNewStoryFirebase(allowEffects, ensureFirebaseApp) {
  ensureFirebaseApp(allowEffects);
}

/** @param {(allowEffects: import('../../../types/allow-effects').AllowEffects, args: { error: unknown, req: object, res: any, next: (error?: unknown) => void }) => void} handler */
export function bindSubmitNewStoryCorsErrorBoundary(handler) {
  return (error, req, res, next) =>
    createEffectInvocationBoundary((permission, args) =>
      handler(permission, args)
    )({ error, req, res, next });
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {any} options */
export function registerSubmitNewStoryEndpoint(allowEffects, options) {
  return createCloudHttpEndpoint(allowEffects, {
    ...options,
    useMiddleware: useSubmitNewStoryMiddleware,
    registerRoute: registerSubmitNewStoryRoute,
    registerEndpoint: registerSubmitNewStoryHttpFunction,
  });
}
