import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from './common-gcf.js';

const { ensureFirebaseApp, resetFirebaseInitializationState } = createFirebaseAppManager(initializeApp);
let cachedDb = null;

export function resolveFirestoreDatabaseId(environment) {
  const rawConfig = environment.FIREBASE_CONFIG;
  if (typeof rawConfig !== 'string' || rawConfig.trim() === '') return null;
  try {
    const { databaseId } = JSON.parse(rawConfig);
    return typeof databaseId === 'string' && databaseId.trim() !== '' ? databaseId : null;
  } catch {
    return null;
  }
}

export function getFirestoreInstance(options = {}) {
  const ensureAppFn = options.ensureAppFn ?? ensureFirebaseApp;
  const getFirestoreFn = options.getFirestoreFn ?? /** @type {typeof getAdminFirestore} */ (getAdminFirestore);
  const environment = options.environment ?? process.env;
  ensureAppFn();
  const databaseId = resolveFirestoreDatabaseId(environment);
  if (shouldBypassFirestoreCache({ ensureAppFn, getFirestoreFn, environment })) return getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
  if (!cachedDb) cachedDb = getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
  return cachedDb;
}

export function clearFirestoreInstanceCache() {
  cachedDb = null;
  resetFirebaseInitializationState();
}

function getFirestoreForDatabase(getFirestoreFn, firebaseApp, databaseId) {
  if (databaseId && databaseId !== '(default)') return firebaseApp ? getFirestoreFn(firebaseApp, databaseId) : getFirestoreFn(databaseId);
  return getFirestoreFn(firebaseApp);
}

function shouldBypassFirestoreCache({ ensureAppFn, getFirestoreFn, environment }) {
  return ensureAppFn !== ensureFirebaseApp || getFirestoreFn !== getAdminFirestore || environment !== process.env;
}
