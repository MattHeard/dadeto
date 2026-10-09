import { describe, expect, it, jest } from '@jest/globals';
import { createCheckoutResponseAdapter } from '../../../src/cloud/create-checkout-session/effect-adapters.js';

describe('checkout response adapter', () => {
  it('requires a capability and delegates response writes', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const response = {
      set: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };
    const adapter = createCheckoutResponseAdapter(response);

    expect(adapter.set(allowEffects, 'Cache-Control', 'no-store')).toBe(
      adapter
    );
    expect(
      adapter.respond(allowEffects, 201, { checkoutSessionId: 'cs-1' })
    ).toBeUndefined();
    expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ checkoutSessionId: 'cs-1' });
  });
});
