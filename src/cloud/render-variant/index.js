import {
  functions,
  FieldValue,
  Storage,
  ensureFirebaseApp,
  getFirestoreInstance,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from './render-variant-gcf.js';
import {
  buildAltsHtml,
  buildHtml,
  createHandleVariantWrite,
  createRenderVariant,
  getVisibleVariants,
  DEFAULT_BUCKET_NAME,
  VISIBILITY_THRESHOLD,
} from './render-variant-core.js';

/**
 * @typedef {(snap: {exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}, context?: {params?: Record<string, string>}) => Promise<null>} RenderVariantHandler
 *   Async renderer that materializes a Firestore variant into HTML and metadata.
 */

ensureFirebaseApp();

const db = getFirestoreInstance();
const storage = new Storage();
const environmentVariables = getEnvironmentVariables();
const bucketName = DEFAULT_BUCKET_NAME;
const projectId =
  environmentVariables.GOOGLE_CLOUD_PROJECT || environmentVariables.GCLOUD_PROJECT;
const urlMapName = environmentVariables.URL_MAP;
const cdnHost = environmentVariables.CDN_HOST;
const dynamicFetch = (...args) =>
  (typeof globalThis.fetch === 'function' ? globalThis.fetch : fetchFn).apply(
    globalThis,
    args
  );

let renderInstance;

/**
 * Resolve the shared render handler, creating it on first access.
 * @returns {RenderVariantHandler} Lazily-instantiated handler that renders Firestore variant documents.
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
      consoleError: (...args) => console.error(...args),
    });
  }

  return renderInstance;
}

const handleVariantWrite = createHandleVariantWrite({
  renderVariant: (snap, context) => resolveRenderVariant()(snap, context),
  getDeleteSentinel: () => FieldValue.delete(),
});

export const renderVariant = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite((change, context) => handleVariantWrite(change, context));

/**
 * Execute the memoized render handler with the provided Firestore change payload.
 * @param {...any} args - Arguments passed to the underlying render handler.
 * @returns {Promise<null>} Promise resolving when the rendering workflow completes.
 */
export const render = (...args) => resolveRenderVariant()(...args);

export { buildAltsHtml, buildHtml, getVisibleVariants, VISIBILITY_THRESHOLD };
