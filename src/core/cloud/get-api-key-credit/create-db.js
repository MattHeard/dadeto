import { createDb as createDbCore } from '../get-api-key-credit-v2/create-db.js';

/**
 * Create the API-key credit Firestore client through the shared implementation.
 * @param {new (...args: unknown[]) => import('@google-cloud/firestore').Firestore} FirestoreCtor Firestore constructor.
 * @param {Record<string, string | undefined>} [environment] Runtime environment.
 * @returns {import('@google-cloud/firestore').Firestore} Firestore client.
 */
export const createDb = (FirestoreCtor, environment) =>
  createDbCore(FirestoreCtor, environment);

export const API_KEY_CREDIT_CREATE_DB_MARKER = true;
