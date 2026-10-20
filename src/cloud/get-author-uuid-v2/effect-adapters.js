/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** Create permission-first adapters for author UUID persistence and responses. */
export function createGetAuthorUuidV2EffectAdapters({ db } = {}) {
  return {
    getAuthorDocument: (allowEffects, reference) => {
      void allowEffects;
      return /** @type {{get: () => Promise<{data: () => Record<string, unknown>|undefined}>}} */ (
        reference
      ).get();
    },
    setAuthorDocument: (allowEffects, reference, data, options) => {
      void allowEffects;
      return /** @type {{set: (data: object, options: object) => Promise<void>}} */ (
        reference
      ).set(data, options);
    },
    resolveBillingIdentity: async (allowEffects, uid) => {
      void allowEffects;
      if (!db) return null;
      const snapshot = await db.collection('api-key-ownership').doc(uid).get();
      const apiKeyUuid = snapshot.data()?.apiKeyUuid;
      return typeof apiKeyUuid === 'string' && apiKeyUuid ? apiKeyUuid : null;
    },
    sendJsonResponse: (allowEffects, response, status, body) => {
      void allowEffects;
      const typedResponse =
        /** @type {{status: (value: number) => {json: (body: unknown) => unknown}}} */ (
          response
        );
      return typedResponse.status(status).json(body);
    },
    setResponseHeader: (allowEffects, response, name, value) => {
      void allowEffects;
      const typedResponse =
        /** @type {{set: (name: string, value: string) => unknown}} */ (
          response
        );
      return typedResponse.set(name, value);
    },
    sendEmptyResponse: (allowEffects, response, status) => {
      void allowEffects;
      const typedResponse =
        /** @type {{status: (value: number) => {send: (body: string) => unknown}}} */ (
          response
        );
      return typedResponse.status(status).send('');
    },
  };
}
