import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createSearchHttpHandler } from '../../core/object-minute-rental-search/search-http.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createSearchHttpResponseEffectAdapters } from './effect-adapters.js';
import { createFirestoreRunnerCommitmentsRepository } from './runner-commitments-repository.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from '../../core/object-minute-rental-search/service-area.js';
import { Storage } from '@google-cloud/storage';
import { createGcsRunnerScheduleProvider } from './runner-schedule-provider.js';

const app = initializeApp();
const db = getAdminFirestore(app, process.env.DATABASE_ID ?? '(default)');
const storage = new Storage();

const handleRequest = createSearchHttpHandler({
  createResponseEffects: createSearchHttpResponseEffectAdapters,
  runnerCommitmentsRepository: createFirestoreRunnerCommitmentsRepository({
    db,
  }),
  serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
  runnerScheduleProvider: createGcsRunnerScheduleProvider({
    storage,
    bucketName: process.env.SEARCH_SCHEDULE_BUCKET,
    objectName: process.env.SEARCH_SCHEDULE_OBJECT,
  }),
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle, createSearchHttpHandler };
