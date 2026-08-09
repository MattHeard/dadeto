import {
  createCheckoutSessionDependencies,
  createDynamicPackageResolver,
} from '../../../../src/core/cloud/create-checkout-session/runtime-core.js';
import { jest } from '@jest/globals';

const snapshot = {
  eurPerUsdMicros: 100_000,
  creditEurMicros: 1_000,
  markupBps: 0,
  operations: {},
};

/**
 *
 * @param root0
 * @param root0.ownership
 * @param root0.customer
 */
function makeDb({ ownership, customer } = {}) {
  return {
    collection: jest.fn(name => ({
      doc: jest.fn(id => ({
        get: jest.fn(async () =>
          name === 'api-key-ownership'
            ? { data: () => ownership }
            : { exists: Boolean(customer), data: () => customer }
        ),
        set: jest.fn(async value => value),
      })),
    })),
  };
}

describe('checkout runtime adapters', () => {
  it('resolves only active packages with positive credits', async () => {
    const getPackage = jest.fn();
    const getCurrentPricingSnapshot = jest.fn(async () => snapshot);
    const resolve = createDynamicPackageResolver({
      getPackage,
      getCurrentPricingSnapshot,
    });

    getPackage.mockResolvedValueOnce(null);
    expect(await resolve('missing')).toBeNull();
    getPackage.mockResolvedValueOnce({ active: false, amountUsdMinor: 100 });
    expect(await resolve('inactive')).toBeNull();
    getPackage.mockResolvedValueOnce({ active: true, amountUsdMinor: 1.5 });
    expect(await resolve('fractional')).toBeNull();
    getPackage.mockResolvedValueOnce({ active: true, amountUsdMinor: 100 });
    getCurrentPricingSnapshot.mockResolvedValueOnce(null);
    expect(await resolve('no-snapshot')).toBeNull();
    getPackage.mockResolvedValueOnce({ active: true, amountUsdMinor: 1 });
    getCurrentPricingSnapshot.mockResolvedValueOnce({
      ...snapshot,
      creditEurMicros: 1_000_000,
    });
    expect(await resolve('too-small')).toBeNull();
    getPackage.mockResolvedValueOnce({
      id: 'standard',
      active: true,
      amountUsdMinor: 100,
    });
    expect(await resolve('standard')).toEqual({
      id: 'standard',
      active: true,
      amountUsdMinor: 100,
      pricingSnapshot: snapshot,
      credits: 100,
    });
  });

  it('adapts database, billing, stripe, and idempotency operations', async () => {
    const db = makeDb({
      ownership: { apiKeyUuid: 'key-1' },
      customer: { stripeCustomerId: 'cus-1' },
    });
    const billing = {
      getPackage: jest.fn(async () => ({ active: true, amountUsdMinor: 100 })),
      getCurrentPricingSnapshot: jest.fn(async () => snapshot),
      createPurchase: jest.fn(async input => input),
      savePurchaseCheckout: jest.fn(async (id, session) => ({ id, session })),
      getPurchase: jest.fn(),
    };
    const stripe = {
      customers: {
        create: jest.fn(async options => ({ id: 'cus-new', options })),
      },
      checkout: {
        sessions: {
          create: jest.fn(async (options, requestOptions) => ({
            options,
            requestOptions,
          })),
        },
      },
    };
    const verifyIdToken = jest.fn();
    const deps = createCheckoutSessionDependencies({
      db,
      billing,
      stripe,
      verifyIdToken,
      publicBillingOrigin: 'https://pay.example',
    });

    expect(await deps.verifyIdToken('token')).toBeUndefined();
    expect(await deps.resolveApiKeyUuidForUid('uid')).toEqual({
      apiKeyUuid: 'key-1',
    });
    expect(await deps.resolveBillingCustomer('uid')).toEqual({
      stripeCustomerId: 'cus-1',
    });
    expect(
      await deps.createBillingCustomer({ email: 'a@example.com' })
    ).toEqual({ id: 'cus-new', options: { email: 'a@example.com' } });
    await deps.saveCustomerMappings('uid', 'cus-1', 'key-1');
    expect(await deps.getCreditPackage('package-1')).toMatchObject({
      credits: 100,
    });
    expect(await deps.createPurchase({ uid: 'uid' })).toEqual({ uid: 'uid' });
    expect(
      await deps.savePurchaseCheckout('purchase-1', { id: 'session-1' })
    ).toEqual({ id: 'purchase-1', session: { id: 'session-1' } });
    expect(
      await deps.createStripeCheckoutSession(
        { mode: 'payment' },
        { idempotencyKey: 'key' }
      )
    ).toEqual({
      options: { mode: 'payment' },
      requestOptions: { idempotencyKey: 'key' },
    });
    expect(deps.publicBillingOrigin).toBe('https://pay.example');

    billing.getPurchase.mockResolvedValueOnce(null);
    expect(
      await deps.resolveIdempotency('uid', 'missing', 'package-1')
    ).toBeNull();
    billing.getPurchase.mockResolvedValueOnce({ packageId: 'other' });
    expect(
      await deps.resolveIdempotency('uid', 'conflict', 'package-1')
    ).toEqual({ conflict: true });
    billing.getPurchase.mockResolvedValueOnce({ packageId: 'package-1' });
    expect(
      await deps.resolveIdempotency('uid', 'incomplete', 'package-1')
    ).toBeNull();
    billing.getPurchase.mockResolvedValueOnce({
      packageId: 'package-1',
      checkoutSessionId: 'session-1',
      checkoutUrl: 'https://checkout',
      checkoutExpiresAt: 123,
    });
    expect(
      await deps.resolveIdempotency('uid', 'complete', 'package-1')
    ).toEqual({
      session: {
        checkoutSessionId: 'session-1',
        url: 'https://checkout',
        expiresAt: 123,
      },
    });
  });

  it('returns null for absent ownership and billing customer records', async () => {
    const db = makeDb();
    const deps = createCheckoutSessionDependencies({
      db,
      billing: {
        getPackage: jest.fn(),
        getCurrentPricingSnapshot: jest.fn(),
        getPurchase: jest.fn(),
      },
      stripe: {
        customers: { create: jest.fn() },
        checkout: { sessions: { create: jest.fn() } },
      },
      verifyIdToken: jest.fn(),
    });
    expect(await deps.resolveApiKeyUuidForUid('uid')).toBeNull();
    expect(await deps.resolveBillingCustomer('uid')).toBeNull();
  });
});
