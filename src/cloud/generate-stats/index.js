import {
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
} from './generate-stats-gcf.js';
import {
  createEnsureFirebaseApp,
  getFirestoreInstance,
  runGenerateStats,
} from '../../core/cloud/generate-stats/run.js';

const ensureFirebaseApp = createEnsureFirebaseApp(initializeApp);
const environment = getEnvironmentVariables();
const db = getFirestoreInstance({
  ensureAppFn: ensureFirebaseApp,
  getFirestoreFn: getFirestore,
  environment,
});

const {
  generateStats: handle,
} = runGenerateStats({
  db,
  auth: getAuth(),
  storage: new Storage(),
  fetchFn,
  env: environment,
  cryptoModule: crypto,
  functions,
  express,
  cors,
});

export { handle };
