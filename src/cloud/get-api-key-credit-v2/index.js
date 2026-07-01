import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import {
  createGetApiKeyCreditV2ExpressHandle,
} from './get-api-key-credit-v2-core.js';

const db = getFirestoreInstance({
  ensureAppFn: createFirebaseAppManager(initializeApp).ensureFirebaseApp,
  getFirestoreFn: getAdminFirestore,
});

const handle = createGetApiKeyCreditV2ExpressHandle({ db });

export { handle };
