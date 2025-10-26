import {
  functions,
  Storage,
  getAuth,
  ensureFirebaseApp,
  getFirestoreInstance,
  ADMIN_UID,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from './render-contents-gcf.js';
import {
  buildHtml,
  createAuthorizationExtractor,
  createApplyCorsHeaders,
  createFetchStoryInfo,
  createFetchTopStoryIds,
  createHandleRenderRequest,
  createRenderContents,
  createValidateRequest,
  DEFAULT_BUCKET_NAME,
  getAllowedOrigins,
} from './render-contents-core.js';

ensureFirebaseApp();

const db = getFirestoreInstance();
const storage = new Storage();
const auth = getAuth();
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
const getAuthorizationToken = createAuthorizationExtractor();

const handleRenderRequest = createHandleRenderRequest({
  validateRequest,
  getAuthorizationToken,
  verifyIdToken: token => auth.verifyIdToken(token),
  adminUid: ADMIN_UID,
  render: () => render(),
});

export const renderContents = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}')
  .onCreate((snap, context) => render(snap, context));

export const triggerRenderContents = functions
  .region('europe-west1')
  .https.onRequest(handleRenderRequest);

export const render = (...args) => resolveRender()(...args);
export const fetchTopStoryIds = (...args) => resolveFetchTopStoryIds()(...args);
export const fetchStoryInfo = (...args) => resolveFetchStoryInfo()(...args);

export { buildHtml, handleRenderRequest };
