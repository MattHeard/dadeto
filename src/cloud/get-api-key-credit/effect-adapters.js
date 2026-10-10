/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** Create permission-first adapters for API-key credit response effects. */
export function createGetApiKeyCreditEffectAdapters() {
  return {
    setResponseHeader: (allowEffects, response, name, value) => {
      void allowEffects;
      return /** @type {{set: (name: string, value: string) => unknown}} */ (
        response
      ).set(name, value);
    },
    sendHttpResponse: (allowEffects, response, status, body, method) => {
      void allowEffects;
      const typedResponse = /** @type {{status: (value: number) => Record<string, (value: unknown) => unknown>}} */ (
        response
      );
      return typedResponse.status(status)[method](body);
    },
  };
}
