import { describe, expect, it, jest } from '@jest/globals';
import {
  createCheckoutResponseAdapter,
  createCustomerMappingWriter,
} from '../../../src/cloud/create-checkout-session/effect-adapters.js';
import { warnIfStripeUnavailable } from '../../../src/cloud/create-checkout-session/startup-effect-adapters.js';
import { createEffectInvocationBoundary } from '../../../src/cloud/allow-effects.js';

describe('checkout customer mapping adapter', () => {
  it('requires a capability and writes both mappings', async () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const writes = [];
    const db = {
      collection: jest.fn(name => ({
        doc: jest.fn(id => ({
          set: jest.fn(async value => writes.push({ name, id, value })),
        })),
      })),
    };

    await createCustomerMappingWriter(db)(
      allowEffects,
      'uid-1',
      'cus-1',
      'key-1'
    );

    expect(writes).toEqual([
      {
        name: 'billing-customers',
        id: 'uid-1',
        value: {
          uid: 'uid-1',
          stripeCustomerId: 'cus-1',
          apiKeyUuid: 'key-1',
        },
      },
      {
        name: 'payment-customers',
        id: 'cus-1',
        value: { uid: 'uid-1', apiKeyUuid: 'key-1' },
      },
    ]);
  });
});

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

describe('checkout startup warning adapter', () => {
  it('logs only when Stripe is unavailable and receives fresh permissions', async () => {
    const warn = jest.fn();
    const permissions = [];
    const invoke = createEffectInvocationBoundary(permission => {
      permissions.push(permission);
      warnIfStripeUnavailable(permission, false, warn);
    });

    await invoke();
    await invoke();

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      'STRIPE_SECRET_KEY is not configured; checkout requests will be unavailable.'
    );
    expect(permissions[0]).not.toBe(permissions[1]);
  });

  it('does not warn when Stripe is configured', async () => {
    const warn = jest.fn();
    const invoke = createEffectInvocationBoundary(permission =>
      warnIfStripeUnavailable(permission, true, warn)
    );

    await invoke();

    expect(warn).not.toHaveBeenCalled();
  });
});
