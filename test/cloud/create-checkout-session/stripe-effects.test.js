import { describe, expect, it, jest } from '@jest/globals';
import { createCheckoutStripeAdapters } from '../../../src/cloud/create-checkout-session/stripe-effects.js';

describe('checkout Stripe command adapters', () => {
  it('receives the capability and preserves Stripe command arguments', async () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const createCustomer = jest.fn(async () => ({ id: 'cus-1' }));
    const createSession = jest.fn(async () => ({
      id: 'cs-1',
      url: 'https://checkout.example/session',
      ['expires_at']: 123,
    }));
    const adapters = createCheckoutStripeAdapters({
      customers: { create: createCustomer },
      checkout: { sessions: { create: createSession } },
    });
    const customerOptions = { metadata: { uid: 'uid-1' } };
    const sessionOptions = { mode: 'payment' };
    const requestOptions = { idempotencyKey: 'checkout:uid-1' };

    await expect(
      adapters.createBillingCustomer(allowEffects, customerOptions)
    ).resolves.toEqual({ stripeCustomerId: 'cus-1' });
    await expect(
      adapters.createStripeCheckoutSession(
        allowEffects,
        sessionOptions,
        requestOptions
      )
    ).resolves.toEqual({
      id: 'cs-1',
      url: 'https://checkout.example/session',
      ['expires_at']: 123,
    });

    expect(createCustomer).toHaveBeenCalledWith(customerOptions);
    expect(createSession).toHaveBeenCalledWith(sessionOptions, requestOptions);
  });

  it('rejects an unavailable Stripe command', async () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const adapters = createCheckoutStripeAdapters(null);

    await expect(
      adapters.createBillingCustomer(allowEffects, {})
    ).rejects.toThrow('Stripe is not configured');
    await expect(
      adapters.createStripeCheckoutSession(allowEffects, {}, {})
    ).rejects.toThrow('Stripe is not configured');
  });
});
