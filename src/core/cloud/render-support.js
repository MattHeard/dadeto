/**
 * Create a fetch wrapper that uses the injected fetch implementation.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>} fetchFn Permission-aware fallback fetch implementation.
 * @param {import('../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Runtime permission boundary.
 * @returns {(...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>} Fetch wrapper.
 */
export function createDynamicFetch(fetchFn, bindEffectBoundary) {
  return (...args) => {
    return bindEffectBoundary(permission => fetchFn(permission, ...args));
  };
}

/**
 * Create a memoized factory wrapper.
 * @template T
 * @param {() => T} factory Factory used to create the value.
 * @returns {() => T} Memoized accessor.
 */
export function createMemoizedLoader(factory) {
  /** @type {T | undefined} */
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
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>} fetchFn Permission-aware fallback fetch implementation.
 * @param {import('../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Runtime permission boundary.
 * @param {(dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>) => unknown} buildInstance Renderer factory.
 * @returns {{ dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>, resolveInstance: () => unknown }} Render runtime helpers.
 */
export function createRenderRuntime(
  fetchFn,
  bindEffectBoundary,
  buildInstance
) {
  const dynamicFetch = createDynamicFetch(fetchFn, bindEffectBoundary);

  return {
    dynamicFetch,
    resolveInstance: createMemoizedLoader(() => buildInstance(dynamicFetch)),
  };
}

/**
 * Create the shared cloud render environment snapshot.
 * @param {{
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   getFirestoreInstance: (options: { environment: Record<string, string | undefined> }) => unknown,
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
  // Stryker disable all -- environment resolution uses the fixed project fallback.
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
  // Stryker restore all
}

/**
 * Build the common dependency bag used by cloud render factories.
 * @param {{
 *   db: unknown,
 *   storage: unknown,
 *   fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
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
 *   fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
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
    ...options,
    randomUUID: () => options.crypto.randomUUID(),
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
 *   fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   projectId: string | undefined,
 *   urlMapName: string | undefined,
 *   cdnHost: string | undefined,
 *   bucketName: string,
 *   objectPrefix: string,
 * }) => unknown} Instance builder.
 */
export function createCloudRenderInstanceBuilder(options) {
  return function buildRenderInstance(state) {
    const dependencies = createCloudRenderInstanceDeps({
      db: state.db,
      storage: state.storage,
      fetchFn: state.fetchFn,
      dynamicFetch: state.dynamicFetch,
      crypto: options.crypto,
      projectId: state.projectId,
      urlMapName: state.urlMapName,
      cdnHost: state.cdnHost,
      bucketName: state.bucketName,
      objectPrefix: state.objectPrefix,
      consoleError: options.consoleError,
    });
    return options.createRenderer(dependencies);
  };
}

/**
 * Build the shared options bag for a cloud render entrypoint.
 * @param {{
 *   initializeApp: () => void,
 *   createFirebaseAppManager: (initializeApp: () => void) => { ensureFirebaseApp: () => void },
 *   getFirestoreInstance: (options: { environment: Record<string, string | undefined> }) => unknown,
 *   Storage: new () => unknown,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary,
 *   resolveBucketName: (environmentVariables: Record<string, string | undefined>, defaultBucketName: string) => string,
 *   resolveObjectPrefix: (environmentVariables: Record<string, string | undefined>) => string,
 *   defaultBucketName: string,
 *   entrypointKind: string,
 *   buildRender: (state: {
 *     db: unknown,
 *     storage: unknown,
 *     fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *     dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *     environmentVariables: Record<string, string | undefined>,
 *     bucketName: string,
 *     objectPrefix: string,
 *     projectId: string | undefined,
 *     urlMapName: string | undefined,
 *     cdnHost: string | undefined,
 *   }) => unknown,
 * }} options Entrypoint dependencies.
 * @returns {typeof options} Shared cloud render options bag.
 */

/**
 * Create the full shared state for a cloud render entrypoint.
 * @param {{
 *   initializeApp: () => void,
 *   createFirebaseAppManager: (initializeApp: () => void) => { ensureFirebaseApp: () => void },
 *   getFirestoreInstance: () => unknown,
 *   Storage: new () => unknown,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary,
 *   resolveBucketName: (environmentVariables: Record<string, string | undefined>, defaultBucketName: string) => string,
 *   resolveObjectPrefix: (environmentVariables: Record<string, string | undefined>) => string,
 *   defaultBucketName: string,
 *   buildRender: (state: {
 *     db: unknown,
 *     storage: unknown,
 *     fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *     dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
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
 *   fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   dynamicFetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   render: () => unknown,
 * }} Full entrypoint state.
 */
export function createCloudRenderEntrypointState(options) {
  // Stryker disable all -- shared render state uses the fixed builder/memoization protocol.
  const { ensureFirebaseApp } = options.createFirebaseAppManager(
    options.initializeApp
  );
  ensureFirebaseApp();

  const context = createCloudRenderContext(options);
  const dynamicFetch = createDynamicFetch(
    options.fetchFn,
    options.bindEffectBoundary
  );
  const render = createMemoizedLoader(() =>
    options.buildRender({
      ...context,
      fetchFn: options.fetchFn,
      dynamicFetch,
    })
  );

  return {
    ...context,
    fetchFn: options.fetchFn,
    dynamicFetch,
    render,
  };
  // Stryker restore all
}
