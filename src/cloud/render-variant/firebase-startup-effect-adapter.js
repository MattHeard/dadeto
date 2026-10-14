/**
 * Initialize Firebase Admin during render-variant composition.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {(allowEffects: import('../../../types/allow-effects').AllowEffects) => void} ensureFirebaseApp Firebase initialization adapter.
 * @returns {void} Initialization completion.
 */
export function initializeRenderVariantFirebase(allowEffects, ensureFirebaseApp) {
  void allowEffects;
  ensureFirebaseApp(allowEffects);
}
