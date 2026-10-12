/**
 * Initialize Firebase Admin during render-contents composition.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {() => void} ensureFirebaseApp Firebase initialization adapter.
 * @returns {void} Initialization completion.
 */
export function initializeRenderContentsFirebase(allowEffects, ensureFirebaseApp) {
  void allowEffects;
  ensureFirebaseApp();
}

/**
 * Compose render-contents exports within the startup capability scope.
 * @param {object} dependencies Cloud entrypoint dependencies.
 * @returns {unknown} Registered render-contents exports.
 */
export function createRenderContentsStartup(dependencies) {
  const deps = /** @type {any} */ (dependencies);
  return createEffectStartupBoundary(allowEffects => {
    initializeRenderContentsFirebase(allowEffects, deps.ensureFirebaseApp);
    const db = deps.getFirestoreInstance({ ensureAppFn: () => {} });
    return deps.createEntrypoint(allowEffects, {
      ...deps,
      db,
      registerRenderContentsTriggers: deps.registerTriggers,
    });
  });
}
import { createEffectStartupBoundary } from '../allow-effects.js';
