// @ts-nocheck
/**
 * Create a fetch wrapper that prefers the global fetch when available.
 * @param {typeof fetch} fetchFn Fallback fetch implementation.
 * @returns {(...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>} Fetch wrapper.
 */
export function createDynamicFetch(fetchFn) {
  return (...args) => {
    let fetchImpl = fetchFn;
    if (typeof globalThis.fetch === 'function') {
      fetchImpl = globalThis.fetch;
    }

    return fetchImpl.apply(globalThis, args);
  };
}

/**
 * Create a memoized factory wrapper.
 * @template T
 * @param {() => T} factory Factory used to create the value.
 * @returns {() => T} Memoized accessor.
 */
export function createMemoizedLoader(factory) {
  let instance;

  return function resolveLoader() {
    if (!instance) {
      instance = factory();
    }

    return instance;
  };
}

/**
 * Create a shared render runtime with dynamic fetch and a memoized renderer.
 * @param {typeof fetch} fetchFn Fallback fetch implementation.
 * @param {(dynamicFetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>) => unknown} buildInstance Renderer factory.
 * @returns {{ dynamicFetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>, resolveInstance: () => unknown }} Render runtime helpers.
 */
export function createRenderRuntime(fetchFn, buildInstance) {
  const dynamicFetch = createDynamicFetch(fetchFn);

  return {
    dynamicFetch,
    resolveInstance: createMemoizedLoader(() => buildInstance(dynamicFetch)),
  };
}

/**
 * Create the shared cloud render environment snapshot.
 * @param {{
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   getFirestoreInstance: () => unknown,
 *   Storage: new () => unknown,
 *   resolveBucketName: (environmentVariables: Record<string, string | undefined>, defaultBucketName: string) => string,
 *   resolveObjectPrefix: (environmentVariables: Record<string, string | undefined>) => string,
 *   defaultBucketName: string,
 * }} options Render environment dependencies.
 * @returns {{
 *   db: unknown,
 *   storage: unknown,
 *   environmentVariables: Record<string, string | undefined>,
 *   bucketName: string,
 *   objectPrefix: string,
 *   projectId: string | undefined,
 *   urlMapName: string | undefined,
 *   cdnHost: string | undefined,
 * }} Shared render environment.
 */
export function createCloudRenderContext(options) {
  const environmentVariables = options.getEnvironmentVariables();
  const db = options.getFirestoreInstance({
    environment: environmentVariables,
  });
  const storage = new options.Storage();
  const bucketName = options.resolveBucketName(
    environmentVariables,
    options.defaultBucketName
  );
  const objectPrefix = options.resolveObjectPrefix(environmentVariables);
  const projectId =
    environmentVariables.GOOGLE_CLOUD_PROJECT ||
    environmentVariables.GCLOUD_PROJECT;
  const urlMapName = environmentVariables.URL_MAP;
  const cdnHost = environmentVariables.CDN_HOST;

  return {
    db,
    storage,
    environmentVariables,
    bucketName,
    objectPrefix,
    projectId,
    urlMapName,
    cdnHost,
  };
}

/**
 * Build the common dependency bag used by cloud render factories.
 * @param {{
 *   db: unknown,
 *   storage: unknown,
 *   dynamicFetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
 *   crypto: { randomUUID: () => string },
 *   projectId: string | undefined,
 *   urlMapName: string | undefined,
 *   cdnHost: string | undefined,
 *   bucketName: string,
 *   objectPrefix: string,
 *   consoleError: (...args: unknown[]) => void,
 * }} options Render dependency inputs.
 * @returns {{
 *   db: unknown,
 *   storage: unknown,
 *   fetchFn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
 *   randomUUID: () => string,
 *   projectId: string | undefined,
 *   urlMapName: string | undefined,
 *   cdnHost: string | undefined,
 *   bucketName: string,
 *   objectPrefix: string,
 *   consoleError: (...args: unknown[]) => void,
 * }} Shared render dependency bag.
 */
export function createCloudRenderInstanceDeps(options) {
  return {
    db: options.db,
    storage: options.storage,
    fetchFn: options.dynamicFetch,
    randomUUID: () => options.crypto.randomUUID(),
    projectId: options.projectId,
    urlMapName: options.urlMapName,
    cdnHost: options.cdnHost,
    bucketName: options.bucketName,
    objectPrefix: options.objectPrefix,
    consoleError: options.consoleError,
  };
}

/**
 * Create a helper that builds cloud render instances from the shared dependency bag.
 * @param {{
 *   createRenderer: (deps: ReturnType<typeof createCloudRenderInstanceDeps>) => unknown,
 *   crypto: { randomUUID: () => string },
 *   consoleError: (...args: unknown[]) => void,
 * }} options Builder dependencies.
 * @returns {(state: {
 *   db: unknown,
 *   storage: unknown,
 *   dynamicFetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
 *   projectId: string | undefined,
 *   urlMapName: string | undefined,
 *   cdnHost: string | undefined,
 *   bucketName: string,
 *   objectPrefix: string,
 * }) => unknown} Instance builder.
 */
export function createCloudRenderInstanceBuilder(options) {
  return function buildRenderInstance(state) {
    return options.createRenderer(
      createCloudRenderInstanceDeps({
        db: state.db,
        storage: state.storage,
        dynamicFetch: state.dynamicFetch,
        crypto: options.crypto,
        projectId: state.projectId,
        urlMapName: state.urlMapName,
        cdnHost: state.cdnHost,
        bucketName: state.bucketName,
        objectPrefix: state.objectPrefix,
        consoleError: options.consoleError,
      })
    );
  };
}

/**
 * Create the full shared state for a cloud render entrypoint.
 * @param {{
 *   initializeApp: () => void,
 *   createFirebaseAppManager: (initializeApp: () => void) => { ensureFirebaseApp: () => void },
 *   getFirestoreInstance: () => unknown,
 *   Storage: new () => unknown,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   fetchFn: typeof fetch,
 *   resolveBucketName: (environmentVariables: Record<string, string | undefined>, defaultBucketName: string) => string,
 *   resolveObjectPrefix: (environmentVariables: Record<string, string | undefined>) => string,
 *   defaultBucketName: string,
 *   buildRender: (state: {
 *     db: unknown,
 *     storage: unknown,
 *     dynamicFetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
 *     environmentVariables: Record<string, string | undefined>,
 *     bucketName: string,
 *     objectPrefix: string,
 *     projectId: string | undefined,
 *     urlMapName: string | undefined,
 *     cdnHost: string | undefined,
 *   }) => unknown,
 * }} options Entrypoint dependencies.
 * @returns {{
 *   db: unknown,
 *   storage: unknown,
 *   environmentVariables: Record<string, string | undefined>,
 *   bucketName: string,
 *   objectPrefix: string,
 *   projectId: string | undefined,
 *   urlMapName: string | undefined,
 *   cdnHost: string | undefined,
 *   dynamicFetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
 *   render: () => unknown,
 * }} Full entrypoint state.
 */
export function createCloudRenderEntrypointState(options) {
  const { ensureFirebaseApp } = options.createFirebaseAppManager(
    options.initializeApp
  );
  ensureFirebaseApp();

  const context = createCloudRenderContext(options);
  const dynamicFetch = createDynamicFetch(options.fetchFn);
  const render = createMemoizedLoader(() =>
    options.buildRender({
      ...context,
      dynamicFetch,
    })
  );

  return {
    ...context,
    dynamicFetch,
    render,
  };
}
