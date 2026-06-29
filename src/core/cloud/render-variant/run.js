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
import { createFirestoreDocumentOnWriteTrigger } from '../cloud-core.js';
import {
  createCloudRenderInstanceBuilder,
  createCloudRenderEntrypointState,
} from '../render-support.js';

/**
 * Wire and return the render-variant cloud exports.
 * @param {{
 *   initializeApp: typeof import('firebase-admin/app').initializeApp,
 *   createFirebaseAppManager: typeof import('../../../cloud/render-variant/render-variant-gcf.js').createFirebaseAppManager,
 *   getFirestoreInstance: typeof import('../../../cloud/render-variant/render-variant-gcf.js').getFirestoreInstance,
 *   getEnvironmentVariables: typeof import('../../../cloud/render-variant/render-variant-gcf.js').getEnvironmentVariables,
 *   functions: typeof import('../../../cloud/render-variant/render-variant-gcf.js').functions,
 *   FieldValue: typeof import('../../../cloud/render-variant/render-variant-gcf.js').FieldValue,
 *   Storage: typeof import('../../../cloud/render-variant/render-variant-gcf.js').Storage,
 *   fetchFn: typeof import('../../../cloud/render-variant/render-variant-gcf.js').fetchFn,
 *   crypto: typeof import('../../../cloud/render-variant/render-variant-gcf.js').crypto,
 *   console?: { error: (...args: unknown[]) => void },
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{ renderVariant: unknown, render: (...args: unknown[]) => Promise<null> }} Wired cloud export objects for index.js.
 */
export function runRenderVariant(deps) {
  const typedDeps = /** @type {any} */ (deps);
  const {
    initializeApp,
    createFirebaseAppManager,
    getFirestoreInstance,
    getEnvironmentVariables,
    functions,
    FieldValue,
    Storage,
    fetchFn,
    crypto,
    console: consoleLike,
  } = typedDeps;
  const resolvedConsole = consoleLike ?? globalThis.console;

  const renderState = /** @type {any} */ (createRenderVariantEntrypointState());
  const { render: resolveRenderVariant, db } = renderState;

  const handleVariantWrite = /** @type {any} */ (createHandleVariantWrite)({
    renderVariant: /** @type {(snap: any) => Promise<null>} */ (
      snap => Promise.resolve(resolveRenderVariant()(snap))
    ),
    getDeleteSentinel: () => FieldValue.delete(),
    db,
  });

  const renderVariant = /** @type {any} */ (
    createFirestoreDocumentOnWriteTrigger({
      functions,
      region: 'europe-west1',
      documentPath: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
      handler: change => handleVariantWrite(change),
    })
  );

  const render = /** @type {(...args: any[]) => any} */ (
    (...args) =>
      /** @type {(...args: unknown[]) => unknown} */ (resolveRenderVariant())(
        ...args
      )
  );

  return /** @type {any} */ ({ renderVariant, render });

  /**
   * Assemble the shared render state for the variant entrypoint.
   * @returns {unknown} Shared render state consumed by the cloud wrapper.
   */
  function createRenderVariantEntrypointState() {
    const renderStateOptions = /** @type {any} */ ({});
    renderStateOptions.initializeApp = initializeApp;
    renderStateOptions.createFirebaseAppManager = createFirebaseAppManager;
    renderStateOptions.getFirestoreInstance = getFirestoreInstance;
    renderStateOptions.Storage = Storage;
    renderStateOptions.getEnvironmentVariables = getEnvironmentVariables;
    renderStateOptions.fetchFn = fetchFn;
    renderStateOptions.resolveBucketName = resolveStaticBucketName;
    renderStateOptions.resolveObjectPrefix = resolveStaticObjectPrefix;
    renderStateOptions.entrypointKind = 'variant';
    renderStateOptions.defaultBucketName = DEFAULT_BUCKET_NAME;
    renderStateOptions.buildRender = /** @type {any} */ (
      /** @type {any} */ (createCloudRenderInstanceBuilder)({
        createRenderer: createRenderVariant,
        crypto,
        consoleError: /** @type {(...args: any[]) => void} */ (
          (...args) => resolvedConsole.error(...args)
        ),
      })
    );
    const renderEntrypointState = /** @type {any} */ (
      /** @type {any} */ (createCloudRenderEntrypointState)(renderStateOptions)
    );

    return renderEntrypointState;
  }
}

export { buildAltsHtml, buildHtml, getVisibleVariants, VISIBILITY_THRESHOLD };
