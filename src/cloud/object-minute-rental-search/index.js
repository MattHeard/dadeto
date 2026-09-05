import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createSearchHttpHandler } from '../../core/object-minute-rental-search/search-http.js';
import { createFirestoreRunnerCommitmentsRepository } from './runner-commitments-repository.js';

const app = initializeApp();
const db = getAdminFirestore(app, process.env.DATABASE_ID ?? '(default)');

const handle = createSearchHttpHandler({
  runnerCommitmentsRepository: createFirestoreRunnerCommitmentsRepository({
    db,
  }),
});

export { handle, createSearchHttpHandler };
