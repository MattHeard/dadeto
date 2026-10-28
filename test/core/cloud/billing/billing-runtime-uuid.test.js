import { jest } from '@jest/globals';
import { createBillingRuntime } from '../../../../src/core/cloud/billing/billing-runtime-core.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

/**
 * Build a storage spy without any host platform dependency.
 * @param {(permission: import('../../../../types/allow-effects').AllowEffects) => string} randomUUID ID provider.
 * @returns {object} Billing fixture.
 */
function fixture(randomUUID) {
  const set = jest.fn(async () => {});
  const doc = jest.fn(() => ({ set }));
  const collection = jest.fn(() => ({ doc }));
  const now = jest.fn(() => new Date('2026-10-28T12:00:00Z'));
  const billing = createBillingRuntime({ collection }, { randomUUID, now });
  return { billing, set, doc, collection, now };
}

const input = {
  apiKeyUuid: 'key',
  creditsIssued: 3,
  pricingSnapshotId: 'daily',
};

test('generated purchase IDs receive the exact request permission only when invoked', async () => {
  const randomUUID = jest.fn(() => 'generated-purchase');
  const { billing, set, doc, collection } = fixture(randomUUID);
  expect(randomUUID).not.toHaveBeenCalled();
  const permission = createAllowEffects();
  const purchase = await billing.createPurchase(permission, input);
  expect(randomUUID.mock.calls).toEqual([[permission]]);
  expect(collection.mock.calls).toEqual([['billing-purchases']]);
  expect(doc.mock.calls).toEqual([['generated-purchase']]);
  expect(purchase).toEqual({
    ...input,
    purchaseId: 'generated-purchase',
    status: 'pending',
    creditsRemaining: 3,
    refundedUsdMinor: 0,
    createdAt: new Date('2026-10-28T12:00:00Z'),
  });
  expect(set.mock.calls).toEqual([[purchase]]);
});

test('provided purchase IDs bypass randomness and preserve caller timestamps', async () => {
  const randomUUID = jest.fn(() => {
    throw new Error('must not generate');
  });
  const { billing, now, doc } = fixture(randomUUID);
  const createdAt = new Date('2026-10-20T00:00:00Z');
  const purchase = await billing.createPurchase(createAllowEffects(), {
    ...input,
    purchaseId: 'provided',
    createdAt,
  });
  expect(purchase.purchaseId).toBe('provided');
  expect(purchase.createdAt).toBe(createdAt);
  expect(randomUUID).not.toHaveBeenCalled();
  expect(now).not.toHaveBeenCalled();
  expect(doc.mock.calls).toEqual([['provided']]);
});

test('UUID generation errors propagate without accessing purchase storage', async () => {
  const failure = new Error('ID provider failed');
  const { billing, collection, set, now } = fixture(() => {
    throw failure;
  });
  await expect(
    billing.createPurchase(createAllowEffects(), input)
  ).rejects.toBe(failure);
  expect(collection).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
  expect(now).not.toHaveBeenCalled();
});

test('separate requests and runtimes keep their own permission and ID provider', async () => {
  const firstPermission = createAllowEffects();
  const secondPermission = createAllowEffects();
  const firstId = jest.fn(() => 'first');
  const secondId = jest.fn(() => 'second');
  const first = fixture(firstId);
  const second = fixture(secondId);
  await first.billing.createPurchase(firstPermission, input);
  await first.billing.createPurchase(secondPermission, input);
  await second.billing.createPurchase(secondPermission, input);
  expect(firstId.mock.calls).toEqual([[firstPermission], [secondPermission]]);
  expect(secondId.mock.calls).toEqual([[secondPermission]]);
  expect(first.doc.mock.calls).toEqual([['first'], ['first']]);
  expect(second.doc.mock.calls).toEqual([['second']]);
});
