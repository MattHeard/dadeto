import { createEffectStartupBoundary } from '../allow-effects.js';
import { initializeReportModerationFirebase } from './effect-adapters.js';

/** Compose report-for-moderation runtime exports within a startup capability. */
export function createReportModerationStartup(dependencies) {
  const deps = /** @type {any} */ (dependencies);
  return createEffectStartupBoundary(allowEffects => {
    initializeReportModerationFirebase(allowEffects, deps.ensureFirebaseApp);
    const db = deps.getFirestoreInstance({ ensureAppFn: () => {} });
    return deps.createEntrypoint(allowEffects, { ...deps, db });
  });
}
