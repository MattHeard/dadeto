import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createSearchHttpHandler } from '../../core/object-minute-rental-search/search-http.js';
import { createObjectMinuteRentalSearch } from '../../core/object-minute-rental-search/search-application.js';
import { DEFAULT_RUNNER_ID } from '../../core/object-minute-rental-search/search-config.js';
import { resolveSearchHttpAllowedOrigins } from './allowed-origins.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createSearchHttpResponseEffectAdapters } from './effect-adapters.js';
import { createFirestoreRunnerCommitmentsRepository } from './runner-commitments-repository.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from '../../core/object-minute-rental-search/service-area.js';
import { Storage } from '@google-cloud/storage';
import { createGcsRunnerScheduleProvider } from './runner-schedule-provider.js';

const app = initializeApp();
const db = getAdminFirestore(app, process.env.DATABASE_ID ?? '(default)');
const storage = new Storage();

const env = process.env;
const runnerCommitmentsRepository = createFirestoreRunnerCommitmentsRepository({
  db,
});
const runnerScheduleProvider = createGcsRunnerScheduleProvider({
  storage,
  bucketName: env.SEARCH_SCHEDULE_BUCKET,
  objectName: env.SEARCH_SCHEDULE_OBJECT,
});
const search = createObjectMinuteRentalSearch({
  runnerCommitmentsRepository,
  runnerId: env.SEARCH_RUNNER_ID ?? DEFAULT_RUNNER_ID,
  serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
});
const handleRequest = createSearchHttpHandler({
  context: {
    search,
    env,
    clock: () => new Date(),
    runnerScheduleProvider,
    allowedOrigins: resolveSearchHttpAllowedOrigins(env),
    defaultRunnerId: DEFAULT_RUNNER_ID,
  },
  createResponseEffects: createSearchHttpResponseEffectAdapters,
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle, createSearchHttpHandler };
