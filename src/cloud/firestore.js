import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from './common-gcf.js';
import { createFirestoreModule } from '../core/cloud/firestore.js';

const firestoreModule = createFirestoreModule({
  initializeApp,
  getFirestore: getAdminFirestore,
  createFirebaseAppManager,
});

export const resolveFirestoreDatabaseId = firestoreModule.resolveFirestoreDatabaseId;
export const getFirestoreInstance = firestoreModule.getFirestoreInstance;
export const clearFirestoreInstanceCache = firestoreModule.clearFirestoreInstanceCache;
