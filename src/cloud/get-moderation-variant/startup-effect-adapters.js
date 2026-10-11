/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */
/** @typedef {import('../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/**
 * Initialize Firebase Admin during startup composition.
 * @param {AllowEffects} permission Startup permission.
 * @param {() => unknown} initializeApp Firebase initializer.
 * @returns {unknown} Initialized app.
 */
export function initializeFirebaseApp(permission, initializeApp) {
  void permission;
  return initializeApp();
}

/**
 * Register Express middleware during startup composition.
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
 * Register the GET endpoint during startup composition.
 * @param {AllowEffects} permission Startup permission.
 * @param {NativeExpressApp} app Express app.
 * @param {string} path Route path.
 * @param {(req: NativeHttpRequest, res: NativeHttpResponse) => unknown} handler Route handler.
 * @returns {void}
 */
export function registerGetRoute(permission, app, path, handler) {
  void permission;
  app.get(path, handler);
}
