/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Adapt an Express response to the capability-aware Chronoflow core contract.
 * @param {{status: (code: number) => unknown, set: (name: string, value: string) => unknown, json: (body: unknown) => unknown, send: (body: string) => unknown}} response Express response methods.
 * @returns {{status: (allowEffects: AllowEffects, code: number) => object, set: (allowEffects: AllowEffects, name: string, value: string) => object, json: (allowEffects: AllowEffects, body: unknown) => unknown, send: (allowEffects: AllowEffects, body: string) => unknown}} Capability-aware response adapter.
 */
export function createChronoflowHttpResponseAdapter(response) {
  /** @type {ReturnType<typeof createChronoflowHttpResponseAdapter>} */
  let adapter;
  adapter = {
    status(allowEffects, code) {
      void allowEffects;
      response.status(code);
      return adapter;
    },
    set(allowEffects, name, value) {
      void allowEffects;
      response.set(name, value);
      return adapter;
    },
    json(allowEffects, body) {
      void allowEffects;
      return response.json(body);
    },
    send(allowEffects, body) {
      void allowEffects;
      return response.send(body);
    },
  };
  return adapter;
}
