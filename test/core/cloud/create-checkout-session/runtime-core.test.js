import {
  createCheckoutSessionDependencies,
  createDynamicPackageResolver,
} from '../../../../src/core/cloud/create-checkout-session/runtime-core.js';
import { jest } from '@jest/globals';

const allowEffects =
  /** @type {import('../../../../types/allow-effects').AllowEffects} */ ({});

const snapshot = {
  eurPerUsdMicros: 100_000,
  creditEurMicros: 1_000,
  markupBps: 0,
  operations: {},
};

/**
 * Create a test database fixture.
 * @param {{ ownership?: unknown, customer?: unknown }} options Fixture data.
 * @returns {{ collection: (...args: unknown[]) => unknown }} Database fixture.
 */
function makeDb({ ownership, customer } = {}) {
  return {
    collection: jest.fn(name => ({
      doc: jest.fn(() => ({
        get: jest.fn(async () => {
          if (name === 'api-key-ownership') return { data: () => ownership };
          return { exists: Boolean(customer), data: () => customer };
        }),
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
      createPurchase: jest.fn(async (_allowEffects, input) => input),
      savePurchaseCheckout: jest.fn(async (_allowEffects, id, session) => ({
        id,
        session,
      })),
      getPurchase: jest.fn(),
    };
    const verifyIdToken = jest.fn();
    const createBillingCustomer = jest.fn(async () => ({
      stripeCustomerId: 'cus-new',
    }));
    const saveCustomerMappings = jest.fn();
    const createStripeCheckoutSession = jest.fn(async () => ({
      id: 'session-1',
      url: 'https://checkout',
      ['expires_at']: 123,
    }));
    const deps = createCheckoutSessionDependencies({
      db,
      billing,
      verifyIdToken,
      createBillingCustomer,
      saveCustomerMappings,
      createStripeCheckoutSession,
      publicBillingOrigin: 'https://pay.example',
      billingEnabled: true,
    });

    expect(deps.verifyIdToken).toBe(verifyIdToken);
    expect(deps.stripeConfigured).toBe(true);
    expect(deps.billingEnabled).toBe(true);
    expect(await deps.verifyIdToken('token')).toBeUndefined();
    expect(await deps.resolveApiKeyUuidForUid('uid')).toEqual({
      apiKeyUuid: 'key-1',
    });
    expect(await deps.resolveBillingCustomer('uid')).toEqual({
      stripeCustomerId: 'cus-1',
    });
    expect(
      await deps.createBillingCustomer(allowEffects, {
        email: 'a@example.com',
      })
    ).toEqual({ stripeCustomerId: 'cus-new' });
    expect(createBillingCustomer).toHaveBeenCalledWith(allowEffects, {
      email: 'a@example.com',
    });
    await deps.saveCustomerMappings(allowEffects, 'uid', 'cus-1', 'key-1');
    expect(saveCustomerMappings).toHaveBeenCalledWith(
      allowEffects,
      'uid',
      'cus-1',
      'key-1'
    );
    expect(await deps.getCreditPackage('package-1')).toMatchObject({
      credits: 100,
    });
    expect(await deps.createPurchase(allowEffects, { uid: 'uid' })).toEqual({
      uid: 'uid',
    });
    expect(billing.createPurchase).toHaveBeenCalledWith(allowEffects, {
      uid: 'uid',
    });
    expect(
      await deps.savePurchaseCheckout(allowEffects, 'purchase-1', {
        id: 'session-1',
      })
    ).toEqual({ id: 'purchase-1', session: { id: 'session-1' } });
    expect(billing.savePurchaseCheckout).toHaveBeenCalledWith(
      allowEffects,
      'purchase-1',
      { id: 'session-1' }
    );
    expect(
      await deps.createStripeCheckoutSession(
        allowEffects,
        { mode: 'payment' },
        { idempotencyKey: 'key' }
      )
    ).toEqual({
      id: 'session-1',
      url: 'https://checkout',
      ['expires_at']: 123,
    });
    expect(createStripeCheckoutSession).toHaveBeenCalledWith(
      allowEffects,
      { mode: 'payment' },
      { idempotencyKey: 'key' }
    );
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
    expect(billing.getPurchase).toHaveBeenLastCalledWith(
      'purchase-uid-complete'
    );
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
      verifyIdToken: jest.fn(),
      createBillingCustomer: jest.fn(),
      saveCustomerMappings: jest.fn(),
      createStripeCheckoutSession: jest.fn(),
    });
    expect(await deps.resolveApiKeyUuidForUid('uid')).toBeNull();
    expect(await deps.resolveBillingCustomer('uid')).toBeNull();
  });
});
