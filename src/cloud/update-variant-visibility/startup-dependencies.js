import { initializeApp } from 'firebase-admin/app';
import {
  ADMIN_UID,
  Storage,
  createFirebaseAppManager,
  crypto,
  functions,
  getAuth,
  getEnvironmentVariables,
  getFirestoreInstance,
} from './update-variant-visibility-gcf.js';
import { createRenderContentsEntrypoint } from '../../core/cloud/render-contents/index.js';
import { createUpdateVariantVisibilityHandler } from '../../core/cloud/update-variant-visibility/update-variant-visibility-core.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';
import {
  createUpdateVariantVisibilityEffectAdapters,
  registerUpdateVariantVisibilityTrigger,
} from './effect-adapters.js';
import { ensureUpdateVariantVisibilityFirebase } from './startup-effect-adapter.js';
import { createUpdateVariantRenderDependencies } from './render-contents-dependencies.js';

/** Build the cloud services used by the startup composer. */
export function createUpdateVariantVisibilityStartupDependencies() {
  const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);
  const { updateFirestoreDocument } =
    createUpdateVariantVisibilityEffectAdapters();
  return {
    ensureFirebaseApp: allowEffects =>
      ensureUpdateVariantVisibilityFirebase(allowEffects, ensureFirebaseApp),
    getFirestoreInstance,
    getEnvironmentVariables,
    createRenderContentsEntrypoint,
    renderContentsDependencies: createUpdateVariantRenderDependencies({
      functions,
      Storage,
      getAuth,
      ADMIN_UID,
      crypto,
      getEnvironmentVariables,
    }),
    createUpdateVariantVisibilityHandler,
    updateFirestoreDocument,
    bindInvocationBoundary: createEffectInvocationBoundary,
    registerTrigger: registerUpdateVariantVisibilityTrigger,
    functions,
  };
}
