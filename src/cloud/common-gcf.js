import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { isDuplicateAppError } from '../core/cloud/cloud-core.js';

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
   * @param {() => void} initFn Initialization function invoked if the app is not yet ready.
   * @returns {void}
   */
  function ensureFirebaseApp(initFn = initializer) {
    if (state.firebaseInitialized) {
      return;
    }

    try {
      initFn();
    } catch (error) {
      if (!isDuplicateAppError(error)) {
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
