/**
 * Ensure Firebase is initialized during startup composition.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {() => void} ensureFirebaseApp Firebase initialization action.
 * @returns {void} Completes startup initialization.
 */
export function ensureSubmitNewPageFirebase(allowEffects, ensureFirebaseApp) {
  void allowEffects;
  ensureFirebaseApp();
}

/**
 * Register middleware on the submit-new-page app.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {{ use: (middleware: unknown) => unknown }} app Express app.
 * @param {unknown} middleware Middleware instance.
 * @returns {unknown} Express registration result.
 */
export function useSubmitNewPageMiddleware(allowEffects, app, middleware) {
  void allowEffects;
  return app.use(middleware);
}

/**
 * Register the submit-new-page POST route.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {{ post: (path: string, handler: unknown) => unknown }} app Express app.
 * @param {string} path Route path.
 * @param {unknown} handler Route handler.
 * @returns {unknown} Express registration result.
 */
export function registerSubmitNewPagePost(allowEffects, app, path, handler) {
  void allowEffects;
  return app.post(path, handler);
}

/**
 * Register the submit-new-page HTTPS endpoint.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {{ region: (name: string) => { https: { onRequest: (handler: unknown) => unknown } } }} functions Firebase Functions API.
 * @param {unknown} app Express app.
 * @returns {unknown} Registered HTTPS endpoint.
 */
export function registerSubmitNewPageEndpoint(allowEffects, functions, app) {
  void allowEffects;
  return functions.region('europe-west1').https.onRequest(app);
}
