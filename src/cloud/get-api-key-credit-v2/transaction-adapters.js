/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Build API-key-credit transaction adapters at the cloud boundary.
 * @param {{ runTransaction: (updateFunction: (transaction: unknown) => Promise<unknown>) => Promise<unknown> }} db Firestore database.
 * @returns {object} Transaction query and command adapters.
 */
export function createGetApiKeyCreditV2TransactionAdapters(db) {
  return {
    /** @param {AllowEffects} allowEffects @param {(transaction: unknown) => Promise<unknown>} updateFunction */
    runTransaction: (allowEffects, updateFunction) => {
      void allowEffects;
      return db.runTransaction(updateFunction);
    },
    /** @param {unknown} transaction @param {import('@google-cloud/firestore').DocumentReference} reference @returns {Promise<import('@google-cloud/firestore').DocumentSnapshot>} */
    getTransactionDocument: (transaction, reference) => {
      const readableTransaction = /** @type {{ get: (ref: import('@google-cloud/firestore').DocumentReference) => Promise<import('@google-cloud/firestore').DocumentSnapshot> }} */ (
        transaction
      );
      return readableTransaction.get(reference);
    },
    /** @param {AllowEffects} allowEffects @param {unknown} transaction @param {import('@google-cloud/firestore').DocumentReference} reference @param {Record<string, unknown>} data */
    setTransactionDocument: (allowEffects, transaction, reference, data) => {
      void allowEffects;
      const writableTransaction = /** @type {{ set: (ref: import('@google-cloud/firestore').DocumentReference, data: Record<string, unknown>) => unknown }} */ (
        transaction
      );
      return writableTransaction.set(reference, data);
    },
  };
}
