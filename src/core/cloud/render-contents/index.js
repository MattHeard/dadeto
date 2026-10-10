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
import * as renderSupport from '../render-support.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Build the render-contents entrypoint from injected dependencies.
 * @param {{
 *   initializeApp: () => void,
 *   functions: {region: (region: string) => {firestore: {document: (path: string) => {onCreate: (handler: (...args: never[]) => unknown) => unknown}}, https: {onRequest: (handler: (...args: never[]) => unknown) => unknown}}},
 *   Storage: new () => unknown,
 *   createSaveRenderedPage: (storage: unknown, bucketName: string) => Parameters<typeof createRenderContents>[0]['saveRenderedPage'],
 *   getAuth: () => {verifyIdToken: (token: string) => Promise<{uid?: string}>},
 *   createFirebaseAppManager: (initializeApp: () => void) => {ensureFirebaseApp: () => void},
 *   getFirestoreInstance: (options?: {environment: Record<string, string|undefined>}) => unknown,
 *   ADMIN_UID: string,
 *   fetchFn: (permission: AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   bindEffectBoundary: Parameters<typeof createRenderContents>[0]['bindEffectBoundary'],
 *   effectFetchFn: Parameters<typeof createRenderContents>[0]['effectFetchFn'],
 *   crypto: {randomUUID: () => string},
 *   getEnvironmentVariables: () => Record<string, string|undefined>
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{
 *   handle: unknown,
 *   handleTrigger: unknown,
 *   render: (permission: AllowEffects, ...args: unknown[]) => Promise<unknown>,
 *   fetchTopStoryIds: (...args: unknown[]) => unknown,
 *   fetchStoryInfo: (...args: unknown[]) => unknown,
 *   buildHtml: typeof buildHtml,
 *   handleRenderRequest: unknown,
 * }} Cloud entrypoint exports and test hooks.
 */
// Stryker disable all -- render-contents entrypoint is fixed Cloud Function wiring.
export function createRenderContentsEntrypoint(deps) {
  const typedDeps = deps;
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
  const effectDependencies = {
    bindEffectBoundary: typedDeps.bindEffectBoundary,
    effectFetchFn: typedDeps.effectFetchFn,
  };
  const {
    db,
    environmentVariables,
    render: resolveRender,
  } = createRenderContentsEntrypointState();
  const typedDb = /** @type {Parameters<typeof createFetchTopStoryIds>[0]} */ (
    db
  );
  const typedResolveRender =
    /** @type {() => (permission: AllowEffects, ...args: unknown[]) => Promise<unknown>} */ (
      resolveRender
    );
  const auth = getAuth();

  const resolveFetchTopStoryIds = renderSupport.createMemoizedLoader(() =>
    createFetchTopStoryIds(typedDb)
  );
  const resolveFetchStoryInfo = renderSupport.createMemoizedLoader(() =>
    createFetchStoryInfo(typedDb)
  );

  const allowedOrigins = getAllowedOrigins(environmentVariables);
  const applyCorsHeaders = createApplyCorsHeaders({ allowedOrigins });
  const validateRequest = createValidateRequest({ applyCorsHeaders });

  const handleRenderRequest = buildHandleRenderRequest({
    validateRequest,
    verifyIdToken: token => auth.verifyIdToken(token),
    adminUid: ADMIN_UID,
    render: async () => {
      await typedDeps.bindEffectBoundary(permission => render(permission));
    },
  });

  const handle = functions
    .region('europe-west1')
    .firestore.document('stories/{storyId}')
    .onCreate((snap, context) =>
      typedDeps.bindEffectBoundary(permission =>
        render(permission, snap, context)
      )
    );

  const handleTrigger = functions
    .region('europe-west1')
    .https.onRequest(handleRenderRequest);

  /**
   * Forward render calls to the memoized render implementation.
   * @param {AllowEffects} permission Permission for storage writes.
   * @param {...unknown} args Render call arguments.
   * @returns {Promise<unknown>} Render result from the shared core helper.
   */
  function render(permission, ...args) {
    return typedResolveRender()(permission, ...args);
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
   * @returns {ReturnType<typeof renderSupport.createCloudRenderEntrypointState>} Shared render state consumed by the cloud wrapper.
   */
  function createRenderContentsEntrypointState() {
    const renderStateOptions = {
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      Storage,
      getEnvironmentVariables,
      fetchFn,
      ...effectDependencies,
      resolveBucketName: resolveStaticBucketName,
      resolveObjectPrefix: resolveStaticObjectPrefix,
      entrypointKind: 'contents',
      defaultBucketName: DEFAULT_BUCKET_NAME,
    };
    const buildRender = renderSupport.createCloudRenderInstanceBuilder({
      createRenderer: dependencies => {
        const { storage, bucketName, ...rendererDependencies } = dependencies;
        return createRenderContents(
          /** @type {Parameters<typeof createRenderContents>[0]} */ ({
            ...rendererDependencies,
            ...effectDependencies,
            saveRenderedPage: typedDeps.createSaveRenderedPage(
              storage,
              bucketName
            ),
          })
        );
      },
      crypto,
      consoleError: (...args) => console.error(...args),
    });
    return renderSupport.createCloudRenderEntrypointState({
      ...renderStateOptions,
      buildRender,
    });
  }
}
// Stryker restore all
