import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createStripeRefundAdapter } from '../../../src/cloud/billing/refund-stripe-adapter.js';

describe('createStripeRefundAdapter', () => {
  it('passes the refund request and stable idempotency options to Stripe', async () => {
    const create = jest.fn(async () => ({ id: 're-1', status: 'pending' }));
    const adapter = createStripeRefundAdapter({ refunds: { create } });
    const input = {
      ['payment_intent']: 'pi-1',
      amount: 250,
      reason: 'requested_by_customer',
      metadata: { ['refund_intent_id']: 'refund-1' },
    };
    const options = { idempotencyKey: 'dadeto-refund-refund-1' };

    await expect(
      adapter(createAllowEffects(), input, options)
    ).resolves.toEqual({ id: 're-1', status: 'pending' });
    expect(create).toHaveBeenCalledWith(input, options);
  });

  it('fails closed when the Stripe client is not configured', async () => {
    const adapter = createStripeRefundAdapter(null);
    await expect(
      adapter(createAllowEffects(), {}, { idempotencyKey: 'refund-1' })
    ).rejects.toThrow('Stripe refunds API must be provided');
  });
});
