import { initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import {
  createGetAuthorUuidV2ExpressHandle,
} from './get-author-uuid-v2-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);
ensureFirebaseApp();

const db = getFirestoreInstance({
  ensureAppFn: ensureFirebaseApp,
  getFirestoreFn: getAdminFirestore,
});
const auth = getAdminAuth();
const handle = createGetAuthorUuidV2ExpressHandle({
  db,
  auth,
  randomUUID,
});

export { handle };
