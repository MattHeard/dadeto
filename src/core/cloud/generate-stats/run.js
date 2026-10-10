import { initializeApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import {
  createGenerateStatsCore,
  initializeFirebaseApp,
} from './generate-stats-core.js';
import { createJsonExpressApp } from '../../express-app.js';
import { getAllowedOrigins } from '../allowed-origins.js';
import {
  getFirestoreForDatabase,
  resolveFirestoreDatabaseId,
  createDefaultFirestoreContextChecker,
  createFirestoreInstanceCache,
  createFirestoreInstanceResolver,
} from '../firestore-helpers.js';
import {
  createCorsOptions,
  createCorsOriginHandler,
  isOriginAllowed,
} from '../cloud-core.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../../types/allow-effects').AllowEffectsBoundary} AllowEffectsBoundary */

export { resolveFirestoreDatabaseId };
export { getAllowedOrigins };
export const selectFirestoreDatabase = getFirestoreForDatabase;

/**
 * Build a one-time Firebase initializer for the stats workflow.
 * @param {() => void} [initialInitializeApp] Initialization function to invoke on first use.
 * @returns {(initFn?: () => void) => void} Lazy initializer that only runs once.
 */
export const createEnsureFirebaseApp = (
  initialInitializeApp = initializeApp
) => {
  let firebaseInitialized = false;

  const ensureFirebaseApp = (initFn = initialInitializeApp) => {
    if (firebaseInitialized) {
      return;
    }

    initializeFirebaseApp(initFn);

    firebaseInitialized = true;
  };

  return ensureFirebaseApp;
};

export const ensureFirebaseApp = createEnsureFirebaseApp();

/**
 * Resolve the allowlist of Origins for the generate-stats endpoint.
 * @param {Record<string, string | undefined> | undefined} environmentVariables Runtime environment variables.
 * @returns {string[]} Allowed origins for the current environment.
 */
const firestoreCache = createFirestoreInstanceCache();
const usesDefaultFirestoreContext = createDefaultFirestoreContextChecker(
  ensureFirebaseApp,
  getAdminFirestore,
  process.env
);

/**
 * Determine whether the generate-stats Firestore call can reuse the cached instance.
 * @param {{
 *   ensureAppFn: () => void,
 *   getFirestoreFn: (app?: import('firebase-admin/app').App, databaseId?: string) => import('firebase-admin/firestore').Firestore,
 *   environment: Record<string, unknown>,
 * }} options Firestore resolution inputs.
 * @returns {boolean} True when the cached instance is safe to reuse.
 */
// Stryker disable next-line all -- Firestore cache identity is a fixed
// dependency/environment equality contract.
function shouldUseCachedFirestore(options) {
  return usesDefaultFirestoreContext(options);
}

const resolveFirestoreInstance = createFirestoreInstanceResolver({
  cache: firestoreCache,
  defaultEnsureAppFn: ensureFirebaseApp,
  defaultGetFirestoreFn: getAdminFirestore,
  resolveEnvironment: options => options.environment ?? process.env,
  shouldCache: shouldUseCachedFirestore,
});

/**
 * Resolve the generate-stats Firestore instance.
 * @param {{
 *   ensureAppFn?: () => void,
 *   getFirestoreFn?: typeof getAdminFirestore,
 *   environment?: Record<string, unknown>,
 * }} [options] Optional Firestore overrides for tests.
 * @returns {import('firebase-admin/firestore').Firestore} Firestore instance used by the stats workflow.
 */
export const getFirestoreInstance = (options = {}) => {
  if (
    options.getFirestoreFn !== undefined &&
    typeof options.getFirestoreFn !== 'function'
  ) {
    throw new TypeError('getFirestoreFn must be a function');
  }

  return resolveFirestoreInstance(options);
};

/**
 * Build the public Cloud Function wrapper for generate-stats from injected dependencies.
 * @param {{
 *   db: unknown,
 *   auth: unknown,
 *   storage: unknown,
 *   fetchFn: (permission: import('../../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   effectFetchFn: (permission: import('../../../../types/allow-effects').AllowEffects, input: string, init?: object) => Promise<Response>,
 *   env?: Record<string, string | undefined>,
 *   cryptoModule: { randomUUID: () => string },
 *   bindEffectBoundary: AllowEffectsBoundary,
 *   useMiddleware: (permission: AllowEffects, app: { use: (middleware: unknown) => void }, middleware: unknown) => void,
 *   registerPostRoute: (permission: AllowEffects, app: { post: (path: string, handler: unknown) => void }, path: string, handler: Function) => void,
 *   sendHttpResponse: (permission: AllowEffects, res: import('../../../../types/native-http').NativeHttpResponse, response: { status: number, body: unknown, method: 'send' | 'json' }) => void,
 *   logError: (permission: AllowEffects, logger: { error: (...args: unknown[]) => void }, ...args: unknown[]) => void,
 *   logWarning: (permission: AllowEffects, logger: { warn?: (...args: unknown[]) => void }, ...args: unknown[]) => void,
 *   verifySchedulerRequest?: (req: import('../../../../types/native-http').NativeHttpRequest) => Promise<boolean>,
 *   console?: { error: (...args: unknown[]) => void },
 *   functions: { region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } },
 *   express: () => { use: (middleware: unknown) => void, post: (path: string, handler: unknown) => void },
 *   cors: (options: { origin: (origin: string | undefined, cb: (error: Error | null, allow?: boolean) => void) => void, methods: string[] }) => unknown,
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{
 *   generateStats: unknown,
 *   getStoryCount: (dbRef?: unknown) => Promise<number>,
 *   getPageCount: (dbRef?: unknown) => Promise<number>,
 *   getUnmoderatedPageCount: (dbRef?: unknown) => Promise<number>,
 *   getTopStories: (dbRef?: unknown, limit?: number) => Promise<Array<{ title: string, variantCount: number }>>,
 *   generate: (deps?: unknown) => Promise<null>,
 *   handleRequest: (req: unknown, res: unknown, deps?: unknown) => Promise<void>,
 * }} Cloud entrypoint and core helpers.
 */
export function runGenerateStats(deps) {
  const typedDeps = deps;
  const {
    env,
    console: consoleLike = globalThis.console,
    functions,
    express,
    cors,
    bindEffectBoundary,
    useMiddleware,
    registerPostRoute,
  } = typedDeps;

  const generateStatsCore = createGenerateStatsCore(
    /** @type {any} */ ({ ...typedDeps, console: consoleLike })
  );
  /** @type {(req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => Promise<void>} */
  const handleRequest = (req, res) =>
    bindEffectBoundary(permission =>
      generateStatsCore.handleRequest(permission, req, res)
    );

  const allowedOrigins = getAllowedOrigins(env);
  const createApp = /** @type {any} */ (() => express());
  const appDeps = {
    createApp,
    json: /** @type {any} */ (express).json,
    urlencoded: /** @type {any} */ (express).urlencoded,
  };
  const app = /** @type {any} */ (
    createJsonExpressApp({
      createApp: appDeps.createApp,
      json: appDeps.json,
      urlencoded: appDeps.urlencoded,
    })
  );
  const corsOptions = createCorsOptions(
    createCorsOriginHandler(isOriginAllowed, allowedOrigins)
  );
  const corsMiddleware = cors(corsOptions);
  void bindEffectBoundary(async allowEffects => {
    useMiddleware(allowEffects, app, corsMiddleware);
  });

  const generateStats = createRegionOnRequest(functions, app);
  void bindEffectBoundary(async allowEffects => {
    registerPostRoute(allowEffects, app, '/', handleRequest);
  });

  return /** @type {any} */ ({ generateStats, ...generateStatsCore });
}

/**
 * Bind an app to the europe-west1 HTTPS region.
 * @param {{ region: (name: string) => { https: { onRequest: (app: unknown) => unknown } } }} functions Cloud Functions dependency.
 * @param {unknown} app Express app.
 * @returns {unknown} Cloud function wrapper.
 */
function createRegionOnRequest(functions, app) {
  return functions.region('europe-west1').https.onRequest(app);
}

/**
 * Build the generate-stats Cloud Function handle from runtime dependencies.
 * @param {{
 *   Storage: new () => unknown,
 *   cors: (options: unknown) => unknown,
 *   express: () => { use: (middleware: unknown) => void, post: (path: string, handler: unknown) => void },
 *   functions: { region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } },
 *   getAuth: () => unknown,
 *   getFirestore: typeof getAdminFirestore,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   initializeApp: () => void,
 *   bindEffectBoundary: AllowEffectsBoundary,
 *   useMiddleware: (permission: AllowEffects, app: { use: (middleware: unknown) => void }, middleware: unknown) => void,
 *   registerPostRoute: (permission: AllowEffects, app: { post: (path: string, handler: unknown) => void }, path: string, handler: Function) => void,
 *   sendHttpResponse: (permission: AllowEffects, res: import('../../../../types/native-http').NativeHttpResponse, response: { status: number, body: unknown, method: 'send' | 'json' }) => void,
 *   logError: (permission: AllowEffects, logger: { error: (...args: unknown[]) => void }, ...args: unknown[]) => void,
 *   logWarning: (permission: AllowEffects, logger: { warn?: (...args: unknown[]) => void }, ...args: unknown[]) => void,
 *   fetchFn: (permission: import('../../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *   effectFetchFn: (permission: import('../../../../types/allow-effects').AllowEffects, input: string, init?: object) => Promise<Response>,
 *   crypto: { randomUUID: () => string },
 *   verifySchedulerRequest?: (req: import('../../../../types/native-http').NativeHttpRequest) => Promise<boolean>,
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {unknown} Generate-stats Cloud Function handle.
 */
export function createGenerateStatsHandle(deps) {
  const {
    Storage,
    getAuth,
    getFirestore,
    getEnvironmentVariables,
    initializeApp,
    crypto,
  } = deps;
  const ensureFirebaseApp = createEnsureFirebaseApp(initializeApp);
  const environment = getEnvironmentVariables();
  const db = getFirestoreInstance({
    ensureAppFn: ensureFirebaseApp,
    getFirestoreFn: getFirestore,
    environment,
  });

  return runGenerateStats({
    ...deps,
    db,
    auth: getAuth(),
    storage: new Storage(),
    env: environment,
    cryptoModule: crypto,
  }).generateStats;
}
