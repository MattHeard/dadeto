/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create permission-first adapters for API-key credit transaction and response effects.
 * @param {{ runTransaction: (updateFunction: (transaction: any) => Promise<unknown>) => Promise<unknown> }} db Firestore database.
 * @returns {object} Permission-first effect adapters.
 */
export function createGetApiKeyCreditV2EffectAdapters(db) {
  return {
    runTransaction: (allowEffects, updateFunction) => {
      void allowEffects;
      return db.runTransaction(updateFunction);
    },
    getTransactionDocument: (allowEffects, transaction, reference) => {
      void allowEffects;
      return transaction.get(reference);
    },
    setTransactionDocument: (allowEffects, transaction, reference, data) => {
      void allowEffects;
      return transaction.set(reference, data);
    },
    setResponseHeader: (allowEffects, response, name, value) => {
      void allowEffects;
      return /** @type {{ set: (name: string, value: string) => unknown }} */ (
        response
      ).set(name, value);
    },
    sendHttpResponse: (allowEffects, response, status, body, method) => {
      void allowEffects;
      const typedResponse = /** @type {{ status: (value: number) => Record<string, (value: unknown) => unknown> }} */ (
        response
      );
      return typedResponse.status(status)[method](body);
    },
    logError: (allowEffects, error) => {
      void allowEffects;
      console.error(error);
    },
  };
}
