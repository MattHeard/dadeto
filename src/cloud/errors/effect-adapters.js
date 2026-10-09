/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */

/**
 * Register middleware at the Cloud Function boundary.
 * @param {AllowEffects} allowEffects Permission for this startup effect.
 * @param {NativeExpressApp} app Express application.
 * @param {unknown} middleware Middleware instance.
 * @returns {void}
 */
export function useMiddleware(allowEffects, app, middleware) {
  void allowEffects;
  app.use(middleware);
}

/**
 * Register a POST route at the Cloud Function boundary.
 * @param {AllowEffects} allowEffects Permission for this startup effect.
 * @param {NativeExpressApp} app Express application.
 * @param {string} path Route path.
 * @param {(request: unknown, response: unknown) => unknown} handler Route handler.
 * @returns {void}
 */
export function registerPostRoute(allowEffects, app, path, handler) {
  void allowEffects;
  app.post(path, handler);
}
