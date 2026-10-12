import { createGetApiKeyCreditV2TransactionAdapters } from './transaction-adapters.js';

/**
 * Create permission-first adapters for API-key credit transaction and response effects.
 * @param {{ runTransaction: (updateFunction: (transaction: any) => Promise<unknown>) => Promise<unknown> }} db Firestore database.
 * @returns {object} Permission-first effect adapters.
 */
export function createGetApiKeyCreditV2EffectAdapters(db) {
  return {
    ...createGetApiKeyCreditV2TransactionAdapters(db),
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
