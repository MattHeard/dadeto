import { createOpenAIChatFirestoreRateLimiter } from './firestore-rate-limiter.js';
import { createOpenAIChatFirestoreResultAdapters } from './firestore-result-adapters.js';

/**
 * Build permission-first Firestore adapters for chat state and rate limits.
 * @param {{db: any, hashId: (value: string) => string, now?: () => number}} deps Firestore dependencies.
 * @returns {{resolveBillingIdentity: Function, readResult: Function, saveResult: Function, limitRequest: Function}} Chat adapters.
 */
export function createOpenAIChatFirestoreAdapters(deps) {
  const rateRef = uid =>
    deps.db.collection('openai-chat-rate-limits').doc(deps.hashId(uid));
  return {
    ...createOpenAIChatFirestoreResultAdapters(deps),
    limitRequest: createOpenAIChatFirestoreRateLimiter({
      db: deps.db,
      rateRef,
      now: deps.now,
    }),
  };
}
