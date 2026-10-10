/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create permission-first adapters for Stripe command operations.
 * @param {{customers: {create: (options: object) => Promise<{id: string}>}, checkout: {sessions: {create: (options: object, requestOptions: object) => Promise<{id: string, url: string, expires_at: number}>}}}|null} stripe Stripe client, when configured.
 * @returns {{createBillingCustomer: (allowEffects: AllowEffects, options: object) => Promise<{stripeCustomerId: string}>, createStripeCheckoutSession: (allowEffects: AllowEffects, options: object, requestOptions: object) => Promise<{id: string, url: string, expires_at: number}>}} Permission-aware Stripe commands.
 */
export function createCheckoutStripeAdapters(stripe) {
  return {
    async createBillingCustomer(allowEffects, options) {
      void allowEffects;
      if (!stripe) throw new Error('Stripe is not configured');
      return {
        stripeCustomerId: (await stripe.customers.create(options)).id,
      };
    },
    async createStripeCheckoutSession(allowEffects, options, requestOptions) {
      void allowEffects;
      if (!stripe) throw new Error('Stripe is not configured');
      return stripe.checkout.sessions.create(options, requestOptions);
    },
  };
}
