/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */

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
