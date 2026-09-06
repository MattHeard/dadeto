import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createSearchHttpHandler } from '../../core/object-minute-rental-search/search-http.js';
import { createFirestoreRunnerCommitmentsRepository } from './runner-commitments-repository.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from '../../core/object-minute-rental-search/service-area.js';

const app = initializeApp();
const db = getAdminFirestore(app, process.env.DATABASE_ID ?? '(default)');

const handle = createSearchHttpHandler({
  runnerCommitmentsRepository: createFirestoreRunnerCommitmentsRepository({
    db,
  }),
  serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
});

export { handle, createSearchHttpHandler };
