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

/**
 * Initialize Firebase Admin during composition at the cloud boundary.
 * @param {AllowEffects} permission Permission for startup initialization.
 * @param {() => unknown} initializeApp Firebase Admin initializer.
 * @returns {unknown} Initialization result.
 */
export function initializeFirebaseApp(permission, initializeApp) {
  void permission;
  return initializeApp();
}

/**
 * Bind a permission-aware assignment writer to the configured database.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore database.
 * @returns {(permission: AllowEffects, uid: string, data: object) => Promise<unknown>} Assignment writer capability.
 */
export function createSetModeratorAssignment(database) {
  return async function setModeratorAssignment(permission, uid, data) {
    void permission;
    return database.collection('moderators').doc(uid).set(data, {
      merge: true,
    });
  };
}
