/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create the permission-first Stripe refund adapter.
 * @param {{refunds?: {create: (input: object, options: {idempotencyKey: string}) => Promise<{id: string, status?: string}>}|null} Stripe client.
 * @returns {(allowEffects: AllowEffects, input: object, options: {idempotencyKey: string}) => Promise<{id: string, status?: string}>} Refund creator.
 */
export function createStripeRefundAdapter(stripe) {
  return async function createStripeRefund(allowEffects, input, options) {
    void allowEffects;
    if (!stripe?.refunds?.create)
      throw new TypeError('Stripe refunds API must be provided');
    return stripe.refunds.create(input, options);
  };
}
