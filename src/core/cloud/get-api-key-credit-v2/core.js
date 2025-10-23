import { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';

/**
 * Create a fetchCredit function bound to the supplied Firestore database.
 * @param {import('@google-cloud/firestore').Firestore} db Firestore instance to use for lookups.
 * @returns {(uuid: string) => Promise<number|null>} Function to fetch credit.
 */
export function createFetchCredit(db) {
  return async function fetchCredit(uuid) {
    const snap = await getApiKeyCreditSnapshot(db, uuid);
    if (!snap.exists) {
      return null;
    }
    const data = snap.data() || {};
    return data.credit ?? 0;
  };
}
