import { jest } from '@jest/globals';
import {
  createBillingRuntime,
  createBillingPurchaseId,
} from '../../../src/cloud/billing/runtime-adapter.js';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';

/**
 * Capture storage writes without contacting a database.
 * @returns {{db: object, set: jest.Mock, doc: jest.Mock}} Native adapter fixture.
 */
function database() {
  const set = jest.fn(async () => {});
  const doc = jest.fn(() => ({ set }));
  return { db: { collection: () => ({ doc }) }, set, doc };
}

const input = {
  apiKeyUuid: 'key',
  creditsIssued: 2,
  pricingSnapshotId: 'daily',
  createdAt: new Date('2026-10-28T12:00:00Z'),
};
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('native UUID adapter preserves the UUID format and creates distinct values', () => {
  const permission = createAllowEffects();
  const first = createBillingPurchaseId(permission);
  const second = createBillingPurchaseId(permission);
  expect(first).toMatch(uuidPattern);
  expect(second).toMatch(uuidPattern);
  expect(first).not.toBe(second);
});

test.each([undefined, {}, { randomUUID: undefined }])(
  'native runtime supplies identity defaults for %j',
  async options => {
    const { db, set, doc } = database();
    const billing = createBillingRuntime(db, options);
    const purchase = await billing.createPurchase(createAllowEffects(), input);
    expect(purchase).toEqual({
      ...input,
      purchaseId: expect.stringMatching(uuidPattern),
      status: 'pending',
      creditsRemaining: 2,
      refundedUsdMinor: 0,
    });
    expect(doc.mock.calls).toEqual([[purchase.purchaseId]]);
    expect(set.mock.calls).toEqual([[purchase]]);
  }
);

test('explicit native runtime overrides keep their request permission and clock', async () => {
  const { db } = database();
  const permission = createAllowEffects();
  const randomUUID = jest.fn(() => 'override-id');
  const now = jest.fn(() => new Date('2026-10-27T00:00:00Z'));
  const runtime = { randomUUID, now, billingEnabled: false };
  const { createdAt, ...purchaseInput } = input;
  void createdAt;
  const purchase = await createBillingRuntime(db, runtime).createPurchase(
    permission,
    purchaseInput
  );
  expect(purchase.purchaseId).toBe('override-id');
  expect(purchase.createdAt).toEqual(new Date('2026-10-27T00:00:00Z'));
  expect(randomUUID.mock.calls).toEqual([[permission]]);
  expect(now).toHaveBeenCalledTimes(1);
  expect(runtime).toEqual({ randomUUID, now, billingEnabled: false });
});
