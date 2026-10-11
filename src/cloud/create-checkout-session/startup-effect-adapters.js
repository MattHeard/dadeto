/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Report that checkout is unavailable because Stripe is not configured.
 * @param {AllowEffects} allowEffects Permission for startup logging.
 * @param {boolean} stripeConfigured Whether the Stripe client is configured.
 * @param {(message: string) => void} warn Warning logger.
 * @returns {void}
 */
export function warnIfStripeUnavailable(allowEffects, stripeConfigured, warn) {
  void allowEffects;
  if (stripeConfigured) return;
  warn(
    'STRIPE_SECRET_KEY is not configured; checkout requests will be unavailable.'
  );
}
