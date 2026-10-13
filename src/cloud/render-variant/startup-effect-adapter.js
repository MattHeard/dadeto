import { runRenderVariant } from '../../core/cloud/render-variant/run.js';
import {
  createTreeVisibilityRegenerationRunner,
  createTreeVisibilityRegenerationHandlers,
  createTreeVisibilityRegenerationHandles,
} from '../../core/cloud/tree-visibility/run.js';
import { createEffectStartupBoundary } from '../allow-effects.js';
import { initializeRenderVariantFirebase } from './firebase-startup-effect-adapter.js';
import { registerVariantWriteTrigger } from './trigger-effect-adapter.js';
import {
  registerTreeVisibilityHttp,
  registerTreeVisibilitySchedule,
} from './tree-visibility-effect-adapters.js';

/**
 * Compose all render-variant startup exports inside one capability scope.
 * @param {object} dependencies Cloud and render dependencies.
 * @returns {unknown} Render and tree-regeneration Cloud Function exports.
 */
export function createRenderVariantStartup(dependencies) {
  const deps = /** @type {any} */ (dependencies);
  return createEffectStartupBoundary(allowEffects => {
    initializeRenderVariantFirebase(allowEffects, deps.ensureFirebaseApp);
    const db = deps.getFirestoreInstance({ ensureAppFn: () => {} });
    const renderRuntime = runRenderVariant({
      ...deps,
      db,
      startupAllowEffects: allowEffects,
      registerVariantWriteTrigger,
    });
    const runRegeneration = createTreeVisibilityRegenerationRunner(
      () => deps.getFirestoreInstance({ ensureAppFn: () => {} }),
      renderRuntime.render,
      deps.logError
    );
    const handlers = createTreeVisibilityRegenerationHandlers(
      deps.bindEffectBoundary,
      runRegeneration,
      deps.sendTreeVisibilityResponse
    );
    const regenerationHandles = createTreeVisibilityRegenerationHandles(
      allowEffects,
      registerTreeVisibilitySchedule,
      registerTreeVisibilityHttp,
      handlers
    );
    return { ...renderRuntime, regenerationHandles };
  });
}
