/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** Create permission-first adapters for author UUID persistence and responses. */
export function createGetAuthorUuidV2EffectAdapters() {
  return {
    setAuthorDocument: (allowEffects, reference, data, options) => {
      void allowEffects;
      return /** @type {{set: (data: object, options: object) => Promise<void>}} */ (
        reference
      ).set(data, options);
    },
    sendJsonResponse: (allowEffects, response, status, body) => {
      void allowEffects;
      const typedResponse = /** @type {{status: (value: number) => {json: (body: unknown) => unknown}}} */ (
        response
      );
      return typedResponse.status(status).json(body);
    },
  };
}
