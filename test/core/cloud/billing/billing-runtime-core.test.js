import { describe, expect, it } from '@jest/globals';
import { createBillingRuntime } from '../../../../src/core/cloud/billing/billing-runtime-core.js';
import { createFakeFirestore } from '../../../../src/core/local/gcp-simulator/fake-firestore.js';
import { createPricingSnapshot } from '../../../../src/core/cloud/billing/pricing-core.js';

const snapshot = createPricingSnapshot({
  snapshotId: 'daily-1',
  effectiveAt: '2026-08-05T00:00:00.000Z',
  eurPerUsdMicros: 900_000,
  creditEurMicros: 1,
  markupBps: 0,
  operations: [{ id: 'function.invoke', costEurMicros: 3 }],
});

/**
 * Build an in-memory billing runtime fixture.
 * @returns {{ db: object, billing: object }} Test fixture.
 */
function setup() {
  const db = createFakeFirestore();
  const billing = createBillingRuntime(db, {
    randomUUID: () => 'generated-id',
    now: () => new Date('2026-08-05T00:00:00.000Z'),
  });
  return { db, billing };
}

describe('createBillingRuntime', () => {
  it('issues a purchase into a refundable lot exactly once', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase({
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 100,
      pricingSnapshotId: snapshot.snapshotId,
    });

    await expect(
      billing.markPurchasePaid({
        purchaseId: 'purchase-1',
        eventId: 'payment-1',
        stripePaymentIntentId: 'pi-1',
      })
    ).resolves.toMatchObject({ status: 201 });
    await expect(
      billing.markPurchasePaid({
        purchaseId: 'purchase-1',
        eventId: 'payment-2',
        stripePaymentIntentId: 'pi-1',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
    await expect(db.doc('api-key-credit/key-1').get()).resolves.toMatchObject({
      exists: true,
      data: expect.any(Function),
    });
    await expect(
      db.doc('api-key-credit/key-1/lots/purchase-1').get()
    ).resolves.toMatchObject({
      exists: true,
    });
  });

  it('charges operations from FIFO lots using the current snapshot', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase({
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid({
      purchaseId: 'purchase-1',
      eventId: 'paid-1',
    });

    await expect(
      billing.chargeOperation({
        uuid: 'key-1',
        operationId: 'function.invoke',
        eventId: 'operation-1',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { applied: true, amount: 3, credit: 7 },
    });
    await expect(
      billing.chargeOperation({
        uuid: 'key-1',
        operationId: 'function.invoke',
        eventId: 'operation-1',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
  });

  it('migrates an existing aggregate balance into a non-refundable lot', async () => {
    const { db, billing } = setup();
    await db.doc('api-key-credit/key-legacy').set({ credit: 5 });
    await expect(
      billing.applyOperationCharge({
        uuid: 'key-legacy',
        operationId: 'function.invoke',
        eventId: 'operation-legacy',
        pricingSnapshot: snapshot,
      })
    ).resolves.toMatchObject({ body: { applied: true, credit: 2 } });
    await expect(
      db.doc('api-key-credit/key-legacy/lots/legacy').get()
    ).resolves.toMatchObject({ exists: true });
  });

  it('reverses only remaining credits on refund', async () => {
    const { db, billing } = setup();
    await billing.createPurchase({
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid({
      purchaseId: 'purchase-1',
      eventId: 'paid-1',
    });
    const lotBeforeCharge = await db
      .doc('api-key-credit/key-1/lots/purchase-1')
      .get();
    expect(lotBeforeCharge.data()).toMatchObject({ remainingCredits: 10 });
    await billing.applyOperationCharge({
      uuid: 'key-1',
      operationId: 'function.invoke',
      eventId: 'operation-1',
      pricingSnapshot: snapshot,
    });
    const lotBeforeRefund = await db
      .doc('api-key-credit/key-1/lots/purchase-1')
      .get();
    expect(lotBeforeRefund.data()).toMatchObject({ remainingCredits: 7 });

    await expect(
      billing.applyRefundEvent({
        purchaseId: 'purchase-1',
        eventId: 'refund-1',
        refundedUsdMinor: 1_000,
        pricingSnapshotId: snapshot.snapshotId,
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { refunded: true, creditsReversed: 7 },
    });
    await expect(db.doc('api-key-credit/key-1').get()).resolves.toMatchObject({
      data: expect.any(Function),
    });
  });
});
