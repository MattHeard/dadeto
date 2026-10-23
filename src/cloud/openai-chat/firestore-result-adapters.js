const RESULT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Adapt billing identity and idempotency result reads/writes to Firestore.
 * @param {{db: any, hashId: (value: string) => string, now?: () => number}} deps Firestore dependencies.
 * @returns {{resolveBillingIdentity: Function, readResult: Function, saveResult: Function}} Firestore result adapters.
 */
export function createOpenAIChatFirestoreResultAdapters(deps) {
  const resultRef = (billingUuid, attemptId) =>
    deps.db
      .collection('openai-chat-results')
      .doc(deps.hashId(`${billingUuid}:${attemptId}`));
  return {
    resolveBillingIdentity: async (allowEffects, uid) => {
      void allowEffects;
      const snapshot = await deps.db
        .collection('api-key-ownership')
        .doc(uid)
        .get();
      const billingUuid = snapshot.data()?.apiKeyUuid;
      return typeof billingUuid === 'string' && billingUuid
        ? billingUuid
        : null;
    },
    readResult: async (allowEffects, billingUuid, attemptId) => {
      void allowEffects;
      const snapshot = await resultRef(billingUuid, attemptId).get();
      if (!snapshot.exists) return null;
      const value = snapshot.data();
      return typeof value?.requestHash === 'string' &&
        typeof value.reply === 'string'
        ? { requestHash: value.requestHash, reply: value.reply }
        : null;
    },
    saveResult: async (allowEffects, billingUuid, attemptId, result) => {
      void allowEffects;
      await resultRef(billingUuid, attemptId).set(
        {
          ...result,
          expiresAt: new Date((deps.now ?? Date.now)() + RESULT_RETENTION_MS),
        },
        { merge: false }
      );
    },
  };
}
