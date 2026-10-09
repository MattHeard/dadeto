/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */

/**
 * Register middleware on the Express application at the cloud boundary.
 * @param {AllowEffects} allowEffects Permission for this composition effect.
 * @param {NativeExpressApp} app Express application.
 * @param {unknown} middleware Middleware to register.
 * @returns {void}
 */
export function useMiddleware(allowEffects, app, middleware) {
  void allowEffects;
  app.use(middleware);
}
