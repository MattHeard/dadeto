/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Initialize Firebase Admin at the startup boundary.
 * @param {AllowEffects} permission Startup command permission.
 * @param {() => unknown} initializeApp Firebase Admin initializer.
 * @returns {unknown} Initialized app.
 */
export function initializeFirebaseApp(permission, initializeApp) {
  void permission;
  return initializeApp();
}
