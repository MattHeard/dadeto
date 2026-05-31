// @ts-nocheck
/* istanbul ignore file */
import {
  buildHtml,
  buildHandleRenderRequest,
  createApplyCorsHeaders,
  createFetchStoryInfo,
  createFetchTopStoryIds,
  createRenderContents,
  createValidateRequest,
  DEFAULT_BUCKET_NAME,
  getAllowedOrigins,
  resolveStaticBucketName,
  resolveStaticObjectPrefix,
} from './render-contents-core.js';

export function createRenderContentsEntrypoint(deps) {
  const { initializeApp, functions, Storage, getAuth, createFirebaseAppManager, getFirestoreInstance, ADMIN_UID, fetchFn, crypto, getEnvironmentVariables } = deps;
  const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);
  ensureFirebaseApp();

  const db = getFirestoreInstance();
  const storage = new Storage();
  const auth = getAuth();
  const environmentVariables = getEnvironmentVariables();
  const bucketName = resolveStaticBucketName(environmentVariables, DEFAULT_BUCKET_NAME);
  const objectPrefix = resolveStaticObjectPrefix(environmentVariables);
  const projectId = environmentVariables.GOOGLE_CLOUD_PROJECT || environmentVariables.GCLOUD_PROJECT;
  const urlMapName = environmentVariables.URL_MAP;
  const cdnHost = environmentVariables.CDN_HOST;

  const dynamicFetch = (...args) =>
    (typeof globalThis.fetch === 'function' ? globalThis.fetch : fetchFn).apply(globalThis, args);

  let renderInstance;
  let fetchTopStoryIdsInstance;
  let fetchStoryInfoInstance;

  function resolveRender() {
    if (!renderInstance) {
      renderInstance = createRenderContents({
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

  function resolveFetchTopStoryIds() {
    if (!fetchTopStoryIdsInstance) {
      if (!db || typeof db.collection !== 'function') {
        throw new TypeError('db must provide a collection helper');
      }

      fetchTopStoryIdsInstance = createFetchTopStoryIds(db);
    }

    return fetchTopStoryIdsInstance;
  }

  function resolveFetchStoryInfo() {
    if (!fetchStoryInfoInstance) {
      if (!db || typeof db.collection !== 'function') {
        throw new TypeError('db must provide a collection helper');
      }

      fetchStoryInfoInstance = createFetchStoryInfo(db);
    }

    return fetchStoryInfoInstance;
  }

  const allowedOrigins = getAllowedOrigins(environmentVariables);
  const applyCorsHeaders = createApplyCorsHeaders({ allowedOrigins });
  const validateRequest = createValidateRequest({ applyCorsHeaders });

  const handleRenderRequest = buildHandleRenderRequest({
    validateRequest,
    verifyIdToken: token => auth.verifyIdToken(token),
    adminUid: ADMIN_UID,
    render: () => render(),
  });

  const handle = functions
    .region('europe-west1')
    .firestore.document('stories/{storyId}')
    .onCreate((snap, context) => render(snap, context));

  const handleTrigger = functions
    .region('europe-west1')
    .https.onRequest(handleRenderRequest);

  function render(...args) {
    return resolveRender()(...args);
  }

  function fetchTopStoryIds(...args) {
    return resolveFetchTopStoryIds()(...args);
  }

  function fetchStoryInfo(...args) {
    return resolveFetchStoryInfo()(...args);
  }

  return {
    handle,
    handleTrigger,
    render,
    fetchTopStoryIds,
    fetchStoryInfo,
    buildHtml,
    handleRenderRequest,
  };
}
