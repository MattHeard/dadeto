/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Bind an HTTP response to permission-first operations used by search core.
 * @param {{json: (body: unknown) => unknown, status: (code: number) => {json: (body: unknown) => unknown}, setHeader?: (name: string, value: string) => unknown}} response Express response.
 * @returns {{setHeader: (allowEffects: AllowEffects, name: string, value: string) => unknown, setStatus: (allowEffects: AllowEffects, status: number) => unknown, sendJson: (allowEffects: AllowEffects, body: unknown, status?: number) => unknown}} Response effects.
 */
export function createSearchHttpResponseEffectAdapters(response) {
  return {
    setHeader(allowEffects, name, value) {
      void allowEffects;
      return response.setHeader?.(name, value);
    },
    setStatus(allowEffects, status) {
      void allowEffects;
      return response.status(status);
    },
    sendJson(allowEffects, body, status) {
      void allowEffects;
      const target = status === undefined ? response : response.status(status);
      return target.json(body);
    },
  };
}
