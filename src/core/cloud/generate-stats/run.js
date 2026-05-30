// @ts-nocheck
import { initializeApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import {
  createGenerateStatsCore,
  initializeFirebaseApp,
  productionOrigins,
} from './generate-stats-core.js';

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

export const getAllowedOrigins = environmentVariables => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    if (playwrightOrigin) {
      return [playwrightOrigin];
    }

    return [];
  }

  return productionOrigins;
};

const PRODUCTION_DATABASE_ID = '(default)';

export const resolveFirestoreDatabaseId = environment => {
  const rawConfig = environment.FIREBASE_CONFIG;

  if (typeof rawConfig !== 'string' || rawConfig.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(rawConfig);
    const { databaseId } = parsed || {};

    if (typeof databaseId === 'string' && databaseId.trim() !== '') {
      return databaseId;
    }
  } catch {
    // Ignore malformed configuration strings and fall back to the default DB.
  }

  return null;
};

let cachedDb = null;

export const selectFirestoreDatabase = (
  getFirestoreFn,
  firebaseApp,
  databaseId
) => {
  if (databaseId && databaseId !== PRODUCTION_DATABASE_ID) {
    if (!firebaseApp) {
      return getFirestoreFn(databaseId);
    }

    return getFirestoreFn(firebaseApp, databaseId);
  }

  return getFirestoreFn(firebaseApp);
};

/**
 * Determine whether the caller supplied any custom Firestore wiring.
 * @param {() => void} ensureAppFn Firebase app initializer used by the caller.
 * @param {Function} getFirestoreFn Firestore factory used by the caller.
 * @param {Record<string, string | undefined>} environment Environment variables object.
 * @returns {boolean} True when the call should bypass the shared cache.
 */
function hasCustomFirestoreDependencies(
  ensureAppFn,
  getFirestoreFn,
  environment
) {
  return (
    ensureAppFn !== ensureFirebaseApp ||
    getFirestoreFn !== getAdminFirestore ||
    environment !== process.env
  );
}

export const getFirestoreInstance = (options = {}) => {
  const {
    ensureAppFn = ensureFirebaseApp,
    getFirestoreFn = getAdminFirestore,
    environment = process.env,
  } = options;

  if (typeof getFirestoreFn !== 'function') {
    throw new TypeError('getFirestoreFn must be a function');
  }

  ensureAppFn();

  const databaseId = resolveFirestoreDatabaseId(environment);
  if (
    hasCustomFirestoreDependencies(ensureAppFn, getFirestoreFn, environment)
  ) {
    return selectFirestoreDatabase(getFirestoreFn, undefined, databaseId);
  }

  if (!cachedDb) {
    cachedDb = selectFirestoreDatabase(getFirestoreFn, undefined, databaseId);
  }

  return cachedDb;
};

/**
 * Build the public Cloud Function wrapper for generate-stats from injected dependencies.
 * @param {{
 *   db: unknown,
 *   auth: unknown,
 *   storage: unknown,
 *   fetchFn: typeof fetch,
 *   env?: Record<string, string | undefined>,
 *   cryptoModule: { randomUUID: () => string },
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
  const {
    db,
    auth,
    storage,
    fetchFn,
    env,
    cryptoModule,
    console: consoleLike = globalThis.console,
    functions,
    express,
    cors,
  } = deps;

  const generateStatsCore = createGenerateStatsCore({
    db,
    auth,
    storage,
    fetchFn,
    env,
    cryptoModule,
    console: consoleLike,
  });

  const {
    getStoryCount,
    getPageCount,
    getUnmoderatedPageCount,
    getTopStories,
    generate,
    handleRequest,
  } = generateStatsCore;

  const allowedOrigins = getAllowedOrigins(env);
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error('CORS'));
        }
      },
      methods: ['POST'],
    })
  );

  app.post('/', handleRequest);

  const generateStats = functions.region('europe-west1').https.onRequest(app);

  return {
    generateStats,
    getStoryCount,
    getPageCount,
    getUnmoderatedPageCount,
    getTopStories,
    generate,
    handleRequest,
  };
}

/**
 * Build the generate-stats Cloud Function handle from runtime dependencies.
 * @param {{
 *   Storage: new () => unknown,
 *   cors: (options: unknown) => unknown,
 *   express: () => { use: (middleware: unknown) => void, post: (path: string, handler: unknown) => void },
 *   functions: { region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } },
 *   getAuth: () => unknown,
 *   getFirestore: Function,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   initializeApp: () => void,
 *   fetchFn: typeof fetch,
 *   crypto: { randomUUID: () => string },
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {unknown} Generate-stats Cloud Function handle.
 */
export function createGenerateStatsHandle({
  Storage,
  cors,
  express,
  functions,
  getAuth,
  getFirestore,
  getEnvironmentVariables,
  initializeApp,
  fetchFn,
  crypto,
}) {
  const ensureFirebaseApp = createEnsureFirebaseApp(initializeApp);
  const environment = getEnvironmentVariables();
  const db = getFirestoreInstance({
    ensureAppFn: ensureFirebaseApp,
    getFirestoreFn: getFirestore,
    environment,
  });

  return runGenerateStats({
    db,
    auth: getAuth(),
    storage: new Storage(),
    fetchFn,
    env: environment,
    cryptoModule: crypto,
    functions,
    express,
    cors,
  }).generateStats;
}
