import {
  Storage,
  functions,
  express,
  cors,
  initializeApp,
  getAuth,
  getFirestore as getAdminFirestore,
  getEnvironmentVariables,
  crypto,
  fetchFn,
} from './generate-stats-gcf.js';
import {
  createGenerateStatsCore,
  initializeFirebaseApp,
  productionOrigins,
} from './generate-stats-core.js';

let firebaseInitialized = false;

const ensureFirebaseApp = (initFn = initializeApp) => {
  if (firebaseInitialized) {
    return;
  }

  initializeFirebaseApp(initFn);

  firebaseInitialized = true;
};

const getAllowedOrigins = environmentVariables => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    return playwrightOrigin ? [playwrightOrigin] : [];
  }

  return productionOrigins;
};

const PRODUCTION_DATABASE_ID = '(default)';

const resolveFirestoreDatabaseId = (environment = process.env) => {
  const rawConfig = environment?.FIREBASE_CONFIG;

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

const selectFirestoreDatabase = (getFirestoreFn, firebaseApp, databaseId) => {
  if (databaseId && databaseId !== PRODUCTION_DATABASE_ID) {
    return getFirestoreFn(firebaseApp, databaseId);
  }

  return getFirestoreFn(firebaseApp);
};

const getFirestoreInstance = (options = {}) => {
  const {
    ensureAppFn = ensureFirebaseApp,
    getFirestoreFn = getAdminFirestore,
    environment = process.env,
  } = options;

  ensureAppFn();

  const databaseId = resolveFirestoreDatabaseId(environment);
  const useCustomDependencies =
    ensureAppFn !== ensureFirebaseApp ||
    getFirestoreFn !== getAdminFirestore ||
    environment !== process.env;

  if (useCustomDependencies) {
    return selectFirestoreDatabase(getFirestoreFn, undefined, databaseId);
  }

  if (!cachedDb) {
    cachedDb = selectFirestoreDatabase(getFirestoreFn, undefined, databaseId);
  }

  return cachedDb;
};

ensureFirebaseApp();
const env = getEnvironmentVariables();
const db = getFirestoreInstance({ environment: env });
const auth = getAuth();
const storage = new Storage();

const generateStatsCore = createGenerateStatsCore({
  db,
  auth,
  storage,
  fetchFn,
  env,
  cryptoModule: crypto,
});

const {
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
  generate,
  handleRequest,
} = generateStatsCore;

const allowedOrigins = getAllowedOrigins(env) ?? [];
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

export const generateStats = functions
  .region('europe-west1')
  .https.onRequest(app);

export {
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
  generate,
  handleRequest,
};
