import { createOpenAIChatRateLimiter } from '../../core/cloud/openai-chat/openai-chat-core.js';

/**
 * Adapt rate-limit transactions to the default Firestore database.
 * @param {{db: any, rateRef: (uid: string) => any, now?: () => number}} deps Firestore adapters.
 * @returns {(allowEffects: object, uid: string) => Promise<{allowed: boolean, retryAfterSeconds?: number}>} Request limiter.
 */
export function createOpenAIChatFirestoreRateLimiter(deps) {
  return createOpenAIChatRateLimiter({
    now: deps.now,
    runTransaction: async (allowEffects, uid, window, update) => {
      void allowEffects;
      const reference = deps.rateRef(uid);
      return deps.db.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        const value = snapshot.exists ? snapshot.data() : null;
        const current =
          Number.isSafeInteger(value?.window) &&
          Number.isSafeInteger(value?.count) &&
          value.count >= 0
            ? { window: value.window, count: value.count }
            : null;
        const result = update(current);
        if (result.write) transaction.set(reference, result.write);
        return {
          allowed: result.allowed,
          ...(result.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: result.retryAfterSeconds }),
        };
      });
    },
  });
}
