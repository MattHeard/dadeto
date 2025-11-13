import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  Storage,
  getAuth,
  createFirebaseAppManager,
  getFirestoreInstance,
  ADMIN_UID,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from './render-contents-gcf.js';
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
} from './render-contents-core.js';

/**
 * @typedef {import('../../core/cloud/render-contents/render-contents-core.js').RenderDependencies} RenderDependencies
 * @typedef {import('../../core/cloud/render-contents/render-contents-core.js').StoryInfo} StoryInfo
 */

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

ensureFirebaseApp();

const db = getFirestoreInstance();
const storage = new Storage();
const auth = getAuth();
const environmentVariables = getEnvironmentVariables();
const bucketName = DEFAULT_BUCKET_NAME;
const projectId =
  environmentVariables.GOOGLE_CLOUD_PROJECT ||
  environmentVariables.GCLOUD_PROJECT;
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

/**
 * Lazily construct the render routine shared by triggers and HTTP requests.
 * @returns {(deps?: RenderDependencies) => Promise<null>} Render function that publishes HTML pages.
 */
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

/**
 * Lazily construct the Firestore-powered top story id loader.
 * @returns {() => Promise<string[]>} Function that fetches ordered story identifiers.
 */
function resolveFetchTopStoryIds() {
  if (!fetchTopStoryIdsInstance) {
    if (!db || typeof db.collection !== 'function') {
      throw new TypeError('db must provide a collection helper');
    }

    fetchTopStoryIdsInstance = createFetchTopStoryIds(db);
  }

  return fetchTopStoryIdsInstance;
}

/**
 * Lazily construct the Firestore-powered story metadata loader.
 * @returns {(storyId: string) => Promise<StoryInfo | null>} Function that resolves story metadata by id.
 */
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

export const renderContents = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}')
  .onCreate((snap, context) => render(snap, context));

export const triggerRenderContents = functions
  .region('europe-west1')
  .https.onRequest(handleRenderRequest);

/**
 * Render HTML content for new story entries.
 * @param {...unknown} args Arguments forwarded to the underlying render routine.
 * @returns {Promise<null>} Promise resolving when publishing completes.
 */
export const render = (...args) => resolveRender()(...args);

/**
 * Fetch the identifiers for the most popular stories.
 * @param {...unknown} args Arguments forwarded to the top story loader.
 * @returns {Promise<string[]>} Promise resolving with the ordered story identifiers.
 */
export const fetchTopStoryIds = (...args) => resolveFetchTopStoryIds()(...args);

/**
 * Fetch metadata describing a single story.
 * @param {...unknown} args Arguments forwarded to the story info loader.
 * @returns {Promise<StoryInfo | null>} Promise resolving with story metadata or null when unavailable.
 */
export const fetchStoryInfo = (...args) => resolveFetchStoryInfo()(...args);

export { buildHtml, handleRenderRequest };
