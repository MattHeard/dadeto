import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from '../core/cloud/firebase-app-manager.js';

/**
 * @typedef {NodeJS.ProcessEnv} ProcessEnv
 */

export { default as crypto } from 'crypto';
export { createFirebaseAppManager } from '../core/cloud/firebase-app-manager.js';

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

export const { ensureFirebaseApp, resetFirebaseInitializationState } =
  createFirebaseAppManager(initializeApp);
