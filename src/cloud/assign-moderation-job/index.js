import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  createAssignModerationJob,
  createCorsOptions,
  configureUrlencodedBodyParser,
  getAllowedOrigins,
  createRunVariantQuery,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';
import { registerFirebaseInitializationHandlers } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';

let firebaseInitialized = false;

/**
 * Determine whether the Firebase Admin app has already been initialized.
 * @returns {boolean} True when the shared Firebase app is ready.
 */
export function hasFirebaseBeenInitialized() {
  return firebaseInitialized;
}

/**
 * Mark the Firebase Admin app as initialized.
 */
export function markFirebaseInitialized() {
  firebaseInitialized = true;
}

/**
 * Reset the initialization flag. Primarily used in tests.
 */
export function resetFirebaseInitializationState() {
  firebaseInitialized = false;
}

registerFirebaseInitializationHandlers({
  reset: resetFirebaseInitializationState,
});

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
    const duplicateApp =
      error &&
      (error.code === 'app/duplicate-app' ||
        typeof error.message === 'string') &&
      String(error.message).toLowerCase().includes('already exists');

    if (!duplicateApp) {
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
