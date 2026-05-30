// @ts-nocheck
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
    console: consoleLike = globalThis.console,
  } = deps;

  const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);
  ensureFirebaseApp();

  const db = getFirestoreInstance();
  const storage = new Storage();
  const environmentVariables = getEnvironmentVariables();
  const bucketName = resolveStaticBucketName(
    environmentVariables,
    DEFAULT_BUCKET_NAME
  );
  const objectPrefix = resolveStaticObjectPrefix(environmentVariables);
  const projectId =
    environmentVariables.GOOGLE_CLOUD_PROJECT ||
    environmentVariables.GCLOUD_PROJECT;
  const urlMapName = environmentVariables.URL_MAP;
  const cdnHost = environmentVariables.CDN_HOST;
  let dynamicFetch;
  if (typeof globalThis.fetch === 'function') {
    dynamicFetch = (...args) => globalThis.fetch.apply(globalThis, args);
  } else {
    dynamicFetch = (...args) => fetchFn.apply(globalThis, args);
  }

  let renderInstance;

  /**
   * Resolve the shared render handler, creating it on first access.
   * @returns {ReturnType<typeof createRenderVariant>} Memoized render handler.
   */
  function resolveRenderVariant() {
    if (!renderInstance) {
      renderInstance = createRenderVariant({
        db,
        storage,
        fetchFn: dynamicFetch,
        randomUUID: () => crypto.randomUUID(),
        projectId,
        urlMapName,
        cdnHost,
        bucketName,
        objectPrefix,
        consoleError: (...args) => consoleLike.error(...args),
      });
    }

    return renderInstance;
  }

  /* istanbul ignore next */
  const handleVariantWrite = createHandleVariantWrite({
    renderVariant: (snap, context) => resolveRenderVariant()(snap, context),
    getDeleteSentinel: () => FieldValue.delete(),
  });

  /* istanbul ignore next */
  const renderVariant = functions
    .region('europe-west1')
    .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
    .onWrite((change, context) => handleVariantWrite(change, context));

  const render = (...args) => resolveRenderVariant()(...args);

  return { renderVariant, render };
}

export { buildAltsHtml, buildHtml, getVisibleVariants, VISIBILITY_THRESHOLD };
