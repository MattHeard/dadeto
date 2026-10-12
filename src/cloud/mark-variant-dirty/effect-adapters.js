/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */

/**
 * Initialize Firebase Admin during startup composition.
 * @param {AllowEffects} permission Startup permission.
 * @param {typeof import('firebase-admin/app').initializeApp} initializeApp Firebase initializer.
 * @returns {unknown} Initialized app.
 */
export function initializeFirebaseApp(permission, initializeApp) {
  void permission;
  return initializeApp();
}

/**
 * Register middleware at the cloud boundary.
 * @param {AllowEffects} permission Startup permission.
 * @param {NativeExpressApp} app Express app.
 * @param {unknown} middleware Middleware value.
 * @returns {void}
 */
export function useMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}

/**
 * Register a POST route at the cloud boundary.
 * @param {AllowEffects} permission Startup permission.
 * @param {NativeExpressApp} app Express app.
 * @param {string} path Route path.
 * @param {Function} handler Route handler.
 * @returns {void}
 */
export function registerPostRoute(permission, app, path, handler) {
  void permission;
  app.post(path, handler);
}
