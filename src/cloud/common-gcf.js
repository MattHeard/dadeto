import { FieldValue } from 'firebase-admin/firestore';

export { default as crypto } from 'crypto';

export const now = () => FieldValue.serverTimestamp();

/**
 * Retrieve the current environment variables for the Cloud Function.
 * @returns {NodeJS.ProcessEnv} Environment variables exposed to the function.
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
