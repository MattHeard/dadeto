/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Initialize Firebase Admin at a startup boundary.
 * @param {AllowEffects} allowEffects Startup command permission.
 * @param {() => unknown} initializeApp Firebase Admin initializer.
 * @returns {unknown} Initialized app.
 */
export function initializeFirebaseApp(allowEffects, initializeApp) {
  void allowEffects;
  return initializeApp();
}
