/**
 * Initialize Firebase Admin during cloud composition.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup command permission.
 * @param {(allowEffects: import('../../../types/allow-effects').AllowEffects) => void} ensureFirebaseApp Firebase initializer adapter.
 * @returns {void}
 */
export function initializeFirebaseApp(allowEffects, ensureFirebaseApp) {
  void allowEffects;
  ensureFirebaseApp(allowEffects);
}
