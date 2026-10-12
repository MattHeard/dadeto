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

/**
 * @param {AllowEffects} permission Request permission.
 * @param {unknown} reference Firestore document reference.
 * @param {object} data Fields to update.
 * @returns {Promise<unknown>} Firestore update result.
 */
export function updateDocument(permission, reference, data) {
  void permission;
  return /** @type {{update: (fields: object) => Promise<unknown>}} */ (
    reference
  ).update(data);
}
