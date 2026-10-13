/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** @param {AllowEffects} allowEffects Startup permission. @param {() => void} ensureFirebaseApp Firebase startup action. */
export function ensureUpdateVariantVisibilityFirebase(
  allowEffects,
  ensureFirebaseApp
) {
  void allowEffects;
  ensureFirebaseApp();
}

/**
 * Compose render-contents and moderation-rating triggers within startup scope.
 * @param {AllowEffects} allowEffects Startup capability.
 * @param {{ensureFirebaseApp: (allowEffects: AllowEffects) => void, getFirestoreInstance: (options: {ensureAppFn: () => void, environment: Record<string, string | undefined>}) => import('firebase-admin/firestore').Firestore, getEnvironmentVariables: () => Record<string, string | undefined>, createRenderContentsEntrypoint: typeof import('../../core/cloud/render-contents/index.js').createRenderContentsEntrypoint, renderContentsDependencies: object, createUpdateVariantVisibilityHandler: typeof import('../../core/cloud/update-variant-visibility/update-variant-visibility-core.js').createUpdateVariantVisibilityHandler, updateFirestoreDocument: typeof import('./effect-adapters.js').createUpdateVariantVisibilityEffectAdapters extends () => infer T ? T extends {updateFirestoreDocument: infer U} ? U : never : never, bindInvocationBoundary: (handler: (allowEffects: AllowEffects, snapshot: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>) => unknown, registerTrigger: (allowEffects: AllowEffects, functions: unknown, handler: unknown) => unknown, functions: unknown}} deps Cloud startup dependencies.
 * @returns {unknown} Registered moderation-rating trigger.
 */
export function createUpdateVariantVisibilityStartup(allowEffects, deps) {
  deps.ensureFirebaseApp(allowEffects);
  const environment = deps.getEnvironmentVariables();
  const db = deps.getFirestoreInstance({
    ensureAppFn: () => {},
    environment,
  });
  const renderContents = deps.createRenderContentsEntrypoint(
    allowEffects,
    {
      ...deps.renderContentsDependencies,
      db,
      getEnvironmentVariables: () => environment,
    }
  );
  const handler = deps.createUpdateVariantVisibilityHandler({
    db,
    renderContents: renderContents.render,
    updateFirestoreDocument: deps.updateFirestoreDocument,
  });
  return deps.registerTrigger(
    allowEffects,
    deps.functions,
    deps.bindInvocationBoundary(handler)
  );
}
