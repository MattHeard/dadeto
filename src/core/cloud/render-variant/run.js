import {
  buildAltsHtml,
  buildHtml,
  createHandleVariantWrite,
  createRenderVariant,
  getVisibleVariants,
  DEFAULT_BUCKET_NAME,
  resolveStaticBucketName,
  resolveStaticObjectPrefix,
  VISIBILITY_THRESHOLD,
} from './render-variant-core.js';
import {
  createCloudRenderInstanceBuilder,
  createCloudRenderEntrypointStateWithDb,
} from '../render-support.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Wire and return the render-variant cloud exports.
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   getEnvironmentVariables: typeof import('../../../cloud/render-variant/render-variant-gcf.js').getEnvironmentVariables,
 *   functions: typeof import('../../../cloud/render-variant/render-variant-gcf.js').functions,
 *   FieldValue: typeof import('../../../cloud/render-variant/render-variant-gcf.js').FieldValue,
 *   Storage: typeof import('../../../cloud/render-variant/render-variant-gcf.js').Storage,
 *   fetchFn: typeof import('../../../cloud/render-variant/render-variant-gcf.js').fetchFn,
 *   bindEffectBoundary: typeof import('../../../cloud/render-variant/render-variant-gcf.js').bindEffectBoundary,
 *   updateFirestoreDocument: typeof import('../../../cloud/render-variant/effect-adapters.js').updateFirestoreDocument,
 *   setFirestoreDocument: typeof import('../../../cloud/render-variant/effect-adapters.js').setFirestoreDocument,
 *   saveStorageFile: typeof import('../../../cloud/render-variant/effect-adapters.js').saveStorageFile,
 *   effectFetchFn: typeof import('../../../cloud/render-variant/render-variant-gcf.js').effectFetchFn,
 *   registerVariantWriteTrigger: typeof import('../../../cloud/render-variant/trigger-effect-adapter.js').registerVariantWriteTrigger,
 *   crypto: typeof import('../../../cloud/render-variant/render-variant-gcf.js').crypto,
 *   console?: { error: (...args: unknown[]) => void },
 *   startupAllowEffects: AllowEffects,
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{ renderVariant: unknown, render: (...args: unknown[]) => Promise<null> }} Wired cloud export objects for index.js.
 */
export function runRenderVariant(deps) {
  const typedDeps = /** @type {any} */ (deps);
  const {
    db: initializedDb,
    getEnvironmentVariables,
    functions,
    FieldValue,
    Storage,
    fetchFn,
    bindEffectBoundary,
    updateFirestoreDocument,
    setFirestoreDocument,
    saveStorageFile,
    effectFetchFn,
    registerVariantWriteTrigger,
    startupAllowEffects,
    crypto,
    console: consoleLike,
  } = typedDeps;
  const resolvedConsole = consoleLike ?? globalThis.console;

  const renderState = /** @type {any} */ (
    createRenderVariantEntrypointState({ db: initializedDb })
  );
  const { render: resolveRenderVariant, db } = renderState;
  const renderEffectDependencies = {
    bindEffectBoundary,
    updateFirestoreDocument,
    setFirestoreDocument,
    saveStorageFile,
    effectFetchFn,
  };

  const handleVariantWrite = createHandleVariantWrite({
    renderVariant: snap => Promise.resolve(resolveRenderVariant()(snap)),
    getDeleteSentinel: () => FieldValue.delete(),
    db,
    updateDocument: updateFirestoreDocument,
  });

  const renderVariant = registerVariantWriteTrigger(
    startupAllowEffects,
    /** @type {any} */ ({
      functions,
      region: 'europe-west1',
      documentPath: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
      handler: (/** @type {any} */ change) =>
        bindEffectBoundary((/** @type {AllowEffects} */ permission) =>
          handleVariantWrite(permission, change)
        ),
    })
  );

  const render = (/** @type {any[]} */ ...args) =>
    resolveRenderVariant()(...args);

  return { renderVariant, render };

  /**
   * Assemble the shared render state for the variant entrypoint.
   * @param {{db: import('firebase-admin/firestore').Firestore}} root0 Initialized startup state.
   * @returns {unknown} Shared render state consumed by the cloud wrapper.
   */
  function createRenderVariantEntrypointState({ db: initializedDb }) {
    const renderStateOptions = {};
    renderStateOptions.db = initializedDb;
    renderStateOptions.Storage = Storage;
    renderStateOptions.getEnvironmentVariables = getEnvironmentVariables;
    renderStateOptions.fetchFn = fetchFn;
    renderStateOptions.bindEffectBoundary = bindEffectBoundary;
    renderStateOptions.resolveBucketName = resolveStaticBucketName;
    renderStateOptions.resolveObjectPrefix = resolveStaticObjectPrefix;
    renderStateOptions.entrypointKind = 'variant';
    renderStateOptions.defaultBucketName = DEFAULT_BUCKET_NAME;
    renderStateOptions.buildRender = /** @type {any} */ (
      createCloudRenderInstanceBuilder(
        /** @type {any} */ ({
          createRenderer: (/** @type {any} */ dependencies) =>
            createRenderVariant({
              ...dependencies,
              ...renderEffectDependencies,
            }),
          crypto,
          consoleError: (/** @type {any[]} */ ...args) =>
            resolvedConsole.error(...args),
        })
      )
    );
    const renderEntrypointState = /** @type {any} */ (
      createCloudRenderEntrypointStateWithDb(
        /** @type {any} */ (renderStateOptions)
      )
    );

    return renderEntrypointState;
  }
}

export { buildAltsHtml, buildHtml, getVisibleVariants, VISIBILITY_THRESHOLD };
