import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

/**
 * @typedef {import('node:process').ProcessEnv} ProcessEnv
 */

export { default as crypto } from 'crypto';

export const now = () => FieldValue.serverTimestamp();

/**
 * Retrieve the current environment variables for the Cloud Function.
 * @returns {ProcessEnv} Environment variables exposed to the function.
 */
export function getEnvironmentVariables() {
  return process.env;
}

/**
 * Fetch implementation bound to the Cloud Functions global scope.
 * Binding ensures the experimental Node.js fetch retains its context.
 * @type {typeof fetch}
 */
export const fetchFn = globalThis.fetch.bind(globalThis);

/**
 * Determine whether an initialization error indicates a duplicate Firebase app.
 * @param {unknown} error Error thrown during Firebase initialization.
 * @returns {boolean} True when the error corresponds to an already-initialized app.
 */
function isDuplicateFirebaseAppError(error) {
  if (!error) {
    return false;
  }

  const candidate = /** @type {{ code?: string; message?: unknown }} */ (error);
  const hasDuplicateCode = candidate.code === 'app/duplicate-app';
  const hasStringMessage = typeof candidate.message === 'string';
  const messageText = String(candidate.message ?? '').toLowerCase();

  return (
    messageText.includes('already exists') &&
    (hasDuplicateCode || hasStringMessage)
  );
}

/**
 * Create helpers that manage Firebase Admin app initialization state.
 * @param {() => void} initializer Firebase initialization function.
 * @returns {{
 *   ensureFirebaseApp: (initFn?: () => void) => void,
 *   resetFirebaseInitializationState: () => void,
 * }} Firebase initialization helpers.
 */
export function createFirebaseAppManager(initializer) {
  const state = { firebaseInitialized: false };

  /**
   *
   * @param initFn
   */
  function ensureFirebaseApp(initFn = initializer) {
    if (state.firebaseInitialized) {
      return;
    }

    try {
      initFn();
    } catch (error) {
      if (!isDuplicateFirebaseAppError(error)) {
        throw error;
      }
    }

    state.firebaseInitialized = true;
  }

  /**
   *
   */
  function resetFirebaseInitializationState() {
    state.firebaseInitialized = false;
  }

  return { ensureFirebaseApp, resetFirebaseInitializationState };
}

export const { ensureFirebaseApp, resetFirebaseInitializationState } =
  createFirebaseAppManager(initializeApp);
