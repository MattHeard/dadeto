/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create a permission-aware writer for the two Stripe customer mappings.
 * @param {{collection: (name: string) => {doc: (id: string) => {set: (value: object) => Promise<unknown>}}}} db Firestore database.
 * @returns {(allowEffects: AllowEffects, uid: string, customerId: string, apiKeyUuid: string) => Promise<void>} Writer for customer mappings.
 */
export function createCustomerMappingWriter(db) {
  return async function saveCustomerMappings(
    allowEffects,
    uid,
    customerId,
    apiKeyUuid
  ) {
    void allowEffects;
    await db.collection('billing-customers').doc(uid).set({
      uid,
      stripeCustomerId: customerId,
      apiKeyUuid,
    });
    await db.collection('payment-customers').doc(customerId).set({
      uid,
      apiKeyUuid,
    });
  };
}

/**
 * Adapt an Express response to the capability-aware checkout core contract.
 * @param {{set?: (name: string, value: string) => unknown, status: (status: number) => unknown, json: (body: unknown) => unknown}} response Express response methods.
 * @returns {{set: (allowEffects: AllowEffects, name: string, value: string) => object, respond: (allowEffects: AllowEffects, status: number, body: unknown) => unknown}} Capability-aware response adapter.
 */
export function createCheckoutResponseAdapter(response) {
  /** @type {ReturnType<typeof createCheckoutResponseAdapter>} */
  let adapter;
  adapter = {
    set(allowEffects, name, value) {
      void allowEffects;
      response.set?.(name, value);
      return adapter;
    },
    respond(allowEffects, status, body) {
      void allowEffects;
      response.status(status);
      return response.json(body);
    },
  };
  return adapter;
}
