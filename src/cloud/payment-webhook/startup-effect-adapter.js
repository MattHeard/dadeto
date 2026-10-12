import { createDb } from '../../core/cloud/get-api-key-credit-v2/create-db.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Construct the payment webhook's Firestore client at the startup boundary.
 * @param {AllowEffects} allowEffects Permission for client construction.
 * @param {new (...args: unknown[]) => import('@google-cloud/firestore').Firestore} FirestoreConstructor Firestore client constructor.
 * @param {Record<string, string | undefined>} environment Runtime environment.
 * @returns {import('@google-cloud/firestore').Firestore} Firestore client.
 */
export function createPaymentWebhookStartupDb(
  allowEffects,
  FirestoreConstructor,
  environment
) {
  void allowEffects;
  return createDb(FirestoreConstructor, environment);
}
