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
import {
  createCloudRenderInstanceBuilder,
  createMemoizedLoader,
  createCloudRenderEntrypointState,
} from '../render-support.js';

/**
 *
 * @param deps
 */
export function createRenderContentsEntrypoint(deps) {
  const {
    initializeApp,
    functions,
    Storage,
    getAuth,
    createFirebaseAppManager,
    getFirestoreInstance,
    ADMIN_UID,
    fetchFn,
    crypto,
    getEnvironmentVariables,
  } = deps;
  const {
    db,
    storage,
    environmentVariables,
    bucketName,
    objectPrefix,
    projectId,
    urlMapName,
    cdnHost,
    render: resolveRender,
  } = createRenderContentsEntrypointState();
  const auth = getAuth();

  const resolveFetchTopStoryIds = createMemoizedLoader(() =>
    createFetchTopStoryIds(db)
  );
  const resolveFetchStoryInfo = createMemoizedLoader(() =>
    createFetchStoryInfo(db)
  );

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

  function createRenderContentsEntrypointState() {
    const renderStateOptions = {
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      Storage,
      getEnvironmentVariables,
      fetchFn,
      resolveBucketName: resolveStaticBucketName,
      resolveObjectPrefix: resolveStaticObjectPrefix,
      entrypointKind: 'contents',
      defaultBucketName: DEFAULT_BUCKET_NAME,
    };
    renderStateOptions.buildRender = createCloudRenderInstanceBuilder({
        createRenderer: createRenderContents,
        crypto,
        consoleError: (...args) => console.error(...args),
      });
    renderStateOptions.entrypointKind = 'contents';
    return createCloudRenderEntrypointState(renderStateOptions);
  }

}
