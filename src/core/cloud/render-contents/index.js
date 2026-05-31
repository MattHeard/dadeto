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
 * Build the render-contents entrypoint from injected dependencies.
 * @param {Record<string, unknown>} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{
 *   handle: unknown,
 *   handleTrigger: unknown,
 *   render: (...args: unknown[]) => unknown,
 *   fetchTopStoryIds: (...args: unknown[]) => unknown,
 *   fetchStoryInfo: (...args: unknown[]) => unknown,
 *   buildHtml: typeof buildHtml,
 *   handleRenderRequest: unknown,
 * }} Cloud entrypoint exports and test hooks.
 */
export function createRenderContentsEntrypoint(deps) {
  const typedDeps = /** @type {any} */ (deps);
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
  } = typedDeps;
  const {
    db,
    environmentVariables,
    render: resolveRender,
  } = /** @type {any} */ (createRenderContentsEntrypointState());
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

  const handleRenderRequest = /** @type {any} */ (buildHandleRenderRequest)({
    validateRequest,
    verifyIdToken: /** @type {(token: any) => any} */ (token =>
      auth.verifyIdToken(token)
    ),
    adminUid: ADMIN_UID,
    render: () => render(),
  });

  const handle = /** @type {any} */ (functions
    .region('europe-west1')
    .firestore.document('stories/{storyId}')
    .onCreate(
      /** @type {(snap: any, context: any) => any} */ ((snap, context) =>
        render(snap, context)
      )
    ));

  const handleTrigger = /** @type {any} */ (functions
    .region('europe-west1')
    .https.onRequest(handleRenderRequest));

  /**
   * Forward render calls to the memoized render implementation.
   * @param {...unknown} args Render call arguments.
   * @returns {unknown} Render result from the shared core helper.
   */
  function render(...args) {
    return /** @type {(...args: unknown[]) => unknown} */ (resolveRender())(
      ...args
    );
  }

  /**
   * Forward top-story lookups to the memoized loader.
   * @param {...unknown} args Loader arguments.
   * @returns {unknown} Top-story identifiers from the shared loader.
   */
  function fetchTopStoryIds(...args) {
    return /** @type {(...args: unknown[]) => unknown} */ (
      resolveFetchTopStoryIds()
    )(...args);
  }

  /**
   * Forward story lookups to the memoized loader.
   * @param {...unknown} args Loader arguments.
   * @returns {unknown} Story details from the shared loader.
   */
  function fetchStoryInfo(...args) {
    return /** @type {(...args: unknown[]) => unknown} */ (
      resolveFetchStoryInfo()
    )(...args);
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

  /**
   * Assemble the shared render state for this entrypoint.
   * @returns {unknown} Shared render state consumed by the cloud wrapper.
   */
  function createRenderContentsEntrypointState() {
    const renderStateOptions = /** @type {any} */ ({
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
    });
    renderStateOptions.buildRender = /** @type {any} */ (
      /** @type {any} */ (createCloudRenderInstanceBuilder)({
        createRenderer: createRenderContents,
        crypto,
        consoleError: /** @type {(...args: any[]) => void} */ ((...args) =>
          console.error(...args)
        ),
      })
    );
    renderStateOptions.entrypointKind = 'contents';
    return /** @type {any} */ (
      /** @type {any} */ (createCloudRenderEntrypointState)(renderStateOptions)
    );
  }
}
