import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { createSearchHttpHandler } from './search-http.js';

const db = getFirestoreInstance({
  ensureAppFn: createFirebaseAppManager(initializeApp).ensureFirebaseApp,
  getFirestoreFn: getAdminFirestore,
});

const handle = createSearchHttpHandler({ db });

export { handle, createSearchHttpHandler };
