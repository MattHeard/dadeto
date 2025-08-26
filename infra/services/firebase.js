import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

/** Create a new write batch. */
export function createBatch() {
  return db.batch();
}

/** Server timestamp helper. */
export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

/**
 * Increment helper.
 * @param amount
 */
export function increment(amount) {
  return FieldValue.increment(amount);
}

export { db };
