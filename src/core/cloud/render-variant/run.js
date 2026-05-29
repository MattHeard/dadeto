// @ts-nocheck
import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  Storage,
  createFirebaseAppManager,
  getFirestoreInstance,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from '../../../cloud/render-variant/render-variant-gcf.js';
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

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

/**
 * Wire and return the render-variant cloud exports.
 * @returns {{ renderVariant: unknown, render: (...args: unknown[]) => Promise<null> }} Wired cloud export objects for index.js.
 */
export function runRenderVariant() {
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
        consoleError: (...args) => console.error(...args),
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
