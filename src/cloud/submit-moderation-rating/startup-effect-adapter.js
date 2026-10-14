import { createEffectStartupBoundary } from '../allow-effects.js';
import { initializeModerationRatingFirebase } from './firestore-effect-adapters.js';

/** Compose submit-moderation-rating runtime exports within a startup capability. */
export function createSubmitModerationRatingStartup(dependencies) {
  const deps = /** @type {any} */ (dependencies);
  return createEffectStartupBoundary(allowEffects => {
    initializeModerationRatingFirebase(allowEffects, deps.ensureFirebaseApp);
    const db = deps.getFirestoreInstance(allowEffects, { ensureAppFn: () => {} });
    return deps.createEntrypoint(allowEffects, { ...deps, db });
  });
}
