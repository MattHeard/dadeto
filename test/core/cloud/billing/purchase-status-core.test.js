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
  it('requires auth and ownership and returns safe pending/paid data', async () => {
    const handle = setup();
    await expect(handle({ sessionId: 'cs-1' })).resolves.toMatchObject({
      status: 401,
    });
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
    ).resolves.toMatchObject({ body: { status: 'paid', credit: 42 } });
  });
});
