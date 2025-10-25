import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import {
  createAssignModerationJob,
  createFirebaseInitialization,
  createCorsOptions,
  configureUrlencodedBodyParser,
  getAllowedOrigins,
  createRunVariantQuery,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';

const firebaseInitializationHandlers = {
  reset: () => {},
};
let cachedDb = null;

export const firebaseInitialization = createFirebaseInitialization();

const defaultEnsureFirebaseApp = () => {};

/**
 * Determine whether the Firebase Admin app has already been initialized.
 * @returns {boolean} True when the shared Firebase app is ready.
 */
export function hasFirebaseBeenInitialized() {
  return firebaseInitialization.hasBeenInitialized();
}

/**
 * Mark the Firebase Admin app as initialized.
 */
export function markFirebaseInitialized() {
  firebaseInitialization.markInitialized();
}

/**
 * Reset the initialization flag. Primarily used in tests.
 */
function clearFirebaseInitializationFlag() {
  firebaseInitialization.reset();
}

firebaseInitializationHandlers.reset = clearFirebaseInitializationFlag;

/**
 * Reset the initialization flag. Primarily used in tests.
 */
export function resetFirebaseInitializationState() {
  firebaseInitializationHandlers.reset();
}

/**
 * Parse the database identifier from the Firebase configuration.
 * @param {Record<string, unknown>} environment Process environment variables.
 * @returns {string | null} The configured database identifier when available.
 */
function resolveFirestoreDatabaseId(environment = process.env) {
  const rawConfig = environment?.FIREBASE_CONFIG;

  if (typeof rawConfig !== 'string' || rawConfig.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(rawConfig);
    const { databaseId } = parsed;

    if (typeof databaseId === 'string' && databaseId.trim() !== '') {
      return databaseId;
    }
  } catch {
    // Ignore malformed configuration strings and fall back to the default DB.
  }

  return null;
}

/**
 * Select the correct Firestore database given the parsed configuration.
 * @param {(
 *   app?: import('firebase-admin/app').App,
 *   databaseId?: string,
 * ) => import('firebase-admin/firestore').Firestore} getFirestoreFn Firestore factory.
 * @param {import('firebase-admin/app').App} firebaseApp Firebase Admin app instance.
 * @param {string | null} databaseId Desired Firestore database identifier.
 * @returns {import('firebase-admin/firestore').Firestore} Configured Firestore client.
 */
function getFirestoreForDatabase(getFirestoreFn, firebaseApp, databaseId) {
  if (databaseId && databaseId !== '(default)') {
    return getFirestoreFn(firebaseApp, databaseId);
  }

  return getFirestoreFn(firebaseApp);
}

/**
 * Create or return the cached Firestore instance for the active environment.
 * @param {{
 *   ensureAppFn?: () => void,
 *   getFirestoreFn?: (
 *     app?: import('firebase-admin/app').App,
 *     databaseId?: string,
 *   ) => import('firebase-admin/firestore').Firestore,
 *   environment?: Record<string, unknown>,
 * }} [options] Optional dependency overrides for testing. When omitted,
 * the function assumes the Firebase app was initialized by the caller.
 * @returns {import('firebase-admin/firestore').Firestore} Firestore client instance.
 */
function getFirestoreInstance(options = {}) {
  const {
    ensureAppFn = defaultEnsureFirebaseApp,
    getFirestoreFn = getAdminFirestore,
    environment = process.env,
  } = options;

  ensureAppFn();

  const databaseId = resolveFirestoreDatabaseId(environment);
  const useCustomDependencies =
    ensureAppFn !== defaultEnsureFirebaseApp ||
    getFirestoreFn !== getAdminFirestore ||
    environment !== process.env;

  if (useCustomDependencies) {
    return getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
  }

  if (!cachedDb) {
    cachedDb = getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
  }

  return cachedDb;
}

/**
 * Reset the cached Firestore instance. Primarily used in tests.
 */
function clearFirestoreInstanceCache() {
  cachedDb = null;
  resetFirebaseInitializationState();
}

/**
 * Determine whether an initialization error indicates the app already exists.
 * @param {unknown} error Error thrown during Firebase initialization.
 * @returns {boolean} True when the error corresponds to a duplicate app.
 */
function isDuplicateFirebaseAppError(error) {
  if (!error) {
    return false;
  }

  const candidate = /** @type {{ code?: string, message?: unknown }} */ (error);
  const hasDuplicateCode = candidate.code === 'app/duplicate-app';
  const hasStringMessage = typeof candidate.message === 'string';
  const messageText = String(candidate.message ?? '');

  return (
    (hasDuplicateCode || hasStringMessage) &&
    messageText.toLowerCase().includes('already exists')
  );
}

/**
 * Ensure the default Firebase Admin app is initialized.
 * @param {() => void} [initFn] Optional initializer for dependency injection.
 */
function ensureFirebaseApp(initFn = initializeApp) {
  if (hasFirebaseBeenInitialized()) {
    return;
  }

  try {
    initFn();
  } catch (error) {
    if (!isDuplicateFirebaseAppError(error)) {
      throw error;
    }
  }

  markFirebaseInitialized();
}

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const app = express();

const corsOptions = createCorsOptions(
  getAllowedOrigins,
  gcf.getEnvironmentVariables
);

app.use(cors(corsOptions));
configureUrlencodedBodyParser(app, express);

const firebaseResources = { db, auth, app };

setupAssignModerationJobRoute(
  firebaseResources,
  createRunVariantQuery,
  gcf.now
);

export const assignModerationJob = createAssignModerationJob(
  functions,
  firebaseResources
);

export const testing = {
  firebaseInitialization,
  resolveFirestoreDatabaseId,
  getFirestoreInstance,
  clearFirestoreInstanceCache,
};
