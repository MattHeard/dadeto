import { describe, expect, it, jest } from '@jest/globals';
import { createPurchaseStatusHandler } from '../../../../src/core/cloud/billing/purchase-status-core.js';

/**
 * Build a purchase status handler fixture.
 * @param {Record<string, unknown>} purchase Purchase fixture.
 * @returns {(request: object) => Promise<object>} Status handler.
 */
function setup(
  purchase = {
    uid: 'uid-1',
    purchaseId: 'p-1',
    packageId: 'usd-10',
    status: 'pending',
    creditsIssued: 10,
    apiKeyUuid: 'key-1',
  }
) {
  return createPurchaseStatusHandler({
    verifyIdToken: jest.fn(async () => ({ uid: 'uid-1' })),
    getPurchaseByCheckoutSession: jest.fn(async () => purchase),
    getBalance: jest.fn(async () => 42),
  });
}
describe('purchase status', () => {
  it('rejects invalid sessions before authentication', async () => {
    const handle = setup();
    await expect(handle({})).resolves.toEqual({
      status: 400,
      body: { error: 'invalid_session' },
    });
    await expect(handle({ sessionId: 42 })).resolves.toEqual({
      status: 400,
      body: { error: 'invalid_session' },
    });
  });
  it('requires auth and ownership and returns safe pending/paid data', async () => {
    const handle = setup();
    await expect(handle({ sessionId: 'cs-1' })).resolves.toMatchObject({
      status: 401,
    });
    const anchored = createPurchaseStatusHandler({
      verifyIdToken: async token => {
        if (token !== 'token' && token !== 'xxtoken')
          throw new Error('bad token');
        return { uid: 'uid-1' };
      },
      getPurchaseByCheckoutSession: async () => ({
        uid: 'uid-1',
        status: 'pending',
        purchaseId: 'p-1',
        packageId: 'usd-10',
        creditsIssued: 10,
      }),
      getBalance: async () => 42,
    });
    await expect(
      anchored({ sessionId: 'cs-1', authorization: 'xxBearer token' })
    ).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
    await expect(
      anchored({ sessionId: 'cs-1', authorization: 'Bearerx token' })
    ).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
    await expect(
      anchored({ sessionId: 'cs-1', authorization: 'Bearer  token' })
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      handle({ sessionId: 'cs-1', authorization: 42 })
    ).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
    await expect(
      handle({ sessionId: 'cs-1', authorization: 'bearer token' })
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      handle({ sessionId: 'cs-1', authorization: 'Bearer token' })
    ).resolves.toEqual({
      status: 200,
      body: {
        status: 'pending',
        purchaseId: 'p-1',
        packageId: 'usd-10',
        creditsIssued: 10,
      },
    });
    await expect(
      setup({ uid: 'other', status: 'paid' })({
        sessionId: 'cs-1',
        authorization: 'Bearer token',
      })
    ).resolves.toMatchObject({ status: 404 });
  });
  it('includes current balance after payment', async () => {
    await expect(
      setup({
        uid: 'uid-1',
        purchaseId: 'p-1',
        packageId: 'usd-10',
        status: 'paid',
        creditsIssued: 10,
        apiKeyUuid: 'key-1',
      })({ sessionId: 'cs-1', authorization: 'Bearer token' })
    ).resolves.toEqual({
      status: 200,
      body: {
        status: 'paid',
        purchaseId: 'p-1',
        packageId: 'usd-10',
        creditsIssued: 10,
        credit: 42,
      },
    });
  });
  it('handles token verification failures and missing purchases', async () => {
    const verifyIdToken = jest.fn(async () => {
      throw new Error('expired');
    });
    const handle = createPurchaseStatusHandler({
      verifyIdToken,
      getPurchaseByCheckoutSession: jest.fn(),
      getBalance: jest.fn(),
    });
    await expect(
      handle({ sessionId: 'cs-1', authorization: 'Bearer expired' })
    ).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });

    const missing = createPurchaseStatusHandler({
      verifyIdToken: jest.fn(async () => ({ uid: 'uid-1' })),
      getPurchaseByCheckoutSession: jest.fn(async () => null),
      getBalance: jest.fn(),
    });
    await expect(
      missing({ sessionId: 'cs-1', authorization: 'Bearer token' })
    ).resolves.toEqual({
      status: 404,
      body: { error: 'purchase_not_found' },
    });
  });
});
