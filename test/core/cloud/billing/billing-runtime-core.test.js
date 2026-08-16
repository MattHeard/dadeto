import { describe, expect, it, jest } from '@jest/globals';
import {
  billingRuntimeTestUtils,
  createBillingRuntime,
} from '../../../../src/core/cloud/billing/billing-runtime-core.js';
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
  it('reads transaction lots and omits missing snapshots', async () => {
    const firstRef = {};
    const secondRef = {};
    const lots = await billingRuntimeTestUtils.readTransactionLots(
      {
        get: async reference => {
          if (reference === firstRef) {
            return { exists: true, data: () => ({ remainingCredits: 2 }) };
          }
          return { exists: false };
        },
      },
      [{ ref: firstRef }, { ref: secondRef }]
    );

    expect(lots).toEqual([{ ref: firstRef, data: { remainingCredits: 2 } }]);
  });

  it('reads pricing, package, and purchase documents and saves checkout details', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc('pricing-1')
      .set({ snapshotId: 'pricing-1' });
    await db
      .collection('billing-packages')
      .doc('package-1')
      .set({ credits: 5 });
    await billing.createPurchase({
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 5,
    });

    await expect(billing.getPricingSnapshot('pricing-1')).resolves.toEqual({
      snapshotId: 'pricing-1',
    });
    await expect(billing.getPricingSnapshot('missing')).resolves.toBeNull();
    await expect(billing.getPackage('package-1')).resolves.toEqual({
      credits: 5,
    });
    await expect(billing.getPackage('missing')).resolves.toBeNull();
    await expect(billing.getPurchase('purchase-1')).resolves.toMatchObject({
      purchaseId: 'purchase-1',
    });
    await expect(
      billing.getPurchaseByCheckoutSession('missing-session')
    ).resolves.toBeNull();
    await billing.savePurchaseCheckout('purchase-1', {
      checkoutSessionId: 'cs-lookup',
      url: 'https://checkout.test/cs-lookup',
      expiresAt: 456,
    });
    await expect(
      billing.getPurchaseByCheckoutSession('cs-lookup')
    ).resolves.toMatchObject({ checkoutSessionId: 'cs-lookup' });
    await expect(billing.getPurchase('missing')).resolves.toBeNull();

    await billing.savePurchaseCheckout('purchase-1', {
      checkoutSessionId: 'cs-1',
      url: 'https://checkout.test/cs-1',
      expiresAt: 123,
    });
    await expect(billing.getPurchase('purchase-1')).resolves.toMatchObject({
      checkoutSessionId: 'cs-1',
      checkoutUrl: 'https://checkout.test/cs-1',
      checkoutExpiresAt: 123,
    });
  });

  it('selects the latest snapshot effective at the injected clock', async () => {
    const { db, billing } = setup();
    await db.collection('billing-pricing-snapshots').doc('past').set({
      snapshotId: 'past',
      effectiveAt: '2026-08-04T00:00:00.000Z',
    });
    await db.collection('billing-pricing-snapshots').doc('current').set({
      snapshotId: 'current',
      effectiveAt: '2026-08-05T00:00:00.000Z',
    });
    await db.collection('billing-pricing-snapshots').doc('future').set({
      snapshotId: 'future',
      effectiveAt: '2026-08-06T00:00:00.000Z',
    });
    await expect(billing.getCurrentPricingSnapshot()).resolves.toMatchObject({
      snapshotId: 'current',
    });
  });

  it('expires pending purchases idempotently without changing paid purchases', async () => {
    const { billing } = setup();
    await billing.createPurchase({
      purchaseId: 'pending',
      uid: 'uid-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
    });
    await expect(
      billing.markPurchaseExpired({
        purchaseId: 'pending',
        eventId: 'expiry-1',
      })
    ).resolves.toMatchObject({ status: 200, body: { status: 'expired' } });
    await expect(
      billing.markPurchaseExpired({
        purchaseId: 'pending',
        eventId: 'expiry-1',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
    await billing.createPurchase({
      purchaseId: 'paid',
      uid: 'uid-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
    });
    await billing.markPurchasePaid({
      purchaseId: 'paid',
      eventId: 'payment-1',
    });
    await expect(
      billing.markPurchaseExpired({ purchaseId: 'paid', eventId: 'expiry-2' })
    ).resolves.toMatchObject({ body: { ignored: true, status: 'paid' } });
  });

  it('generates purchase identifiers and normalizes non-object snapshots', async () => {
    const { db, billing } = setup();
    const generated = await billing.createPurchase({
      apiKeyUuid: 'key-generated',
      creditsIssued: 1,
    });
    expect(generated.purchaseId).toBe('generated-id');

    await db.collection('billing-packages').doc('scalar').set('not-an-object');
    await expect(billing.getPackage('scalar')).resolves.toBe('not-an-object');

    await db
      .collection('billing-purchases')
      .doc('scalar-purchase')
      .set('scalar');
    await expect(billing.getPurchase('scalar-purchase')).resolves.toEqual({});

    const defaultBilling = createBillingRuntime(db);
    await expect(
      defaultBilling.createPurchase({
        apiKeyUuid: 'default-key',
        creditsIssued: 1,
      })
    ).resolves.toMatchObject({ apiKeyUuid: 'default-key', status: 'pending' });
  });

  it('returns not-found results for missing payments and refunds', async () => {
    const { billing } = setup();
    await expect(
      billing.markPurchasePaid({ purchaseId: 'missing', eventId: 'event-1' })
    ).resolves.toEqual({ status: 404, body: { error: 'purchase_not_found' } });
    await expect(
      billing.applyRefundEvent({ purchaseId: 'missing', eventId: 'event-2' })
    ).resolves.toEqual({ status: 404, body: { error: 'purchase_not_found' } });
  });

  it('covers missing expiry, quarantined transitions, and public ledger references', async () => {
    const { db, billing } = setup();
    await expect(
      billing.markPurchaseExpired({
        purchaseId: 'missing',
        eventId: 'expiry-missing',
      })
    ).resolves.toEqual({ status: 404, body: { error: 'purchase_not_found' } });
    await billing.createPurchase({
      purchaseId: 'invalid-state',
      apiKeyUuid: 'key-invalid-state',
      creditsIssued: 2,
    });
    await db.doc('billing-purchases/invalid-state').set({
      status: 'not-a-valid-state',
      apiKeyUuid: 'key-invalid-state',
      creditsIssued: 2,
    });
    await expect(
      billing.markPurchasePaid({
        purchaseId: 'invalid-state',
        eventId: 'paid-invalid',
      })
    ).resolves.toMatchObject({ body: { quarantined: true } });
    expect(billing.ledgerRef('key-invalid-state', 'event-1')).toBeTruthy();

    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase({
      purchaseId: 'reserve-insufficient',
      apiKeyUuid: 'key-reserve-insufficient',
      creditsIssued: 1,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid({
      purchaseId: 'reserve-insufficient',
      eventId: 'paid-reserve-insufficient',
    });
    await expect(
      billing.reserveOperation({
        uuid: 'key-reserve-insufficient',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-insufficient',
        eventId: 'reserve-insufficient',
        pricingSnapshot: snapshot,
      })
    ).resolves.toEqual({ status: 409, body: { error: 'insufficient_credit' } });

    await db.doc('api-key-credit/key-reconcile').set({ credit: 2 });
    await db.doc('api-key-credit/key-reconcile/lots/lot-1').set({
      remainingCredits: 2,
    });
    await db.doc('api-key-credit/key-reconcile/ledger/event-1').set({
      type: 'credit_added',
      amount: 2,
    });
    await db.doc('billing-purchases/reconcile-purchase').set({
      apiKeyUuid: 'key-reconcile',
      creditsIssued: 2,
      status: 'paid',
    });
    await expect(billing.reconcileIdentity('key-reconcile')).resolves.toEqual(
      expect.objectContaining({
        ok: expect.any(Boolean),
        discrepancies: expect.any(Array),
      })
    );

    await billing.createPurchase({
      purchaseId: 'refund-invalid-state',
      apiKeyUuid: 'key-refund-invalid',
      creditsIssued: 2,
    });
    await db.doc('billing-purchases/refund-invalid-state').set({
      purchaseId: 'refund-invalid-state',
      apiKeyUuid: 'key-refund-invalid',
      creditsIssued: 2,
      status: 'not-a-valid-state',
    });
    await db.doc('api-key-credit/key-refund-invalid').set({ credit: 2 });
    await db
      .doc('api-key-credit/key-refund-invalid/lots/refund-invalid-state')
      .set({
        remainingCredits: 2,
        refundable: true,
      });
    await expect(
      billing.applyRefundEvent({
        purchaseId: 'refund-invalid-state',
        eventId: 'refund-invalid',
      })
    ).resolves.toMatchObject({ body: { quarantined: true } });
  });

  it('creates a legacy lot when paying with an existing aggregate balance', async () => {
    const { db, billing } = setup();
    await db.doc('api-key-credit/key-1').set({ credit: 4 });
    await billing.createPurchase({
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 3,
      pricingSnapshotId: snapshot.snapshotId,
    });

    await expect(
      billing.markPurchasePaid({ purchaseId: 'purchase-1', eventId: 'paid-1' })
    ).resolves.toMatchObject({ status: 201 });
    await expect(
      db.doc('api-key-credit/key-1/lots/legacy').get()
    ).resolves.toMatchObject({
      exists: true,
    });
  });

  it('reports unavailable pricing and insufficient operation credit', async () => {
    const { db, billing } = setup();
    await expect(
      billing.chargeOperation({
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-e-1',
        eventId: 'e-1',
      })
    ).resolves.toEqual({ status: 503, body: { error: 'pricing_unavailable' } });

    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await expect(
      billing.chargeOperation({
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-e-2',
        eventId: 'e-2',
      })
    ).resolves.toEqual({ status: 409, body: { error: 'insufficient_credit' } });
  });

  it('reserves operation credit, settles idempotently, and releases on failure', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase({
      purchaseId: 'reserve-purchase',
      apiKeyUuid: 'key-reserve',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid({
      purchaseId: 'reserve-purchase',
      eventId: 'paid-reserve',
    });
    const reserved = await billing.reserveOperation({
      uuid: 'key-reserve',
      operationType: 'function.invoke',
      operationAttemptId: 'attempt-reserve-1',
      eventId: 'reserve-1',
      pricingSnapshot: snapshot,
    });
    expect(reserved.body).toMatchObject({ status: 'reserved', credit: 7 });
    await expect(
      db.doc('api-key-credit/key-reserve').get()
    ).resolves.toMatchObject({ data: expect.any(Function) });
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-reserve-1',
        eventId: 'settle-1',
        outcome: 'success',
      })
    ).resolves.toMatchObject({ body: { status: 'settled' } });
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-reserve-1',
        eventId: 'settle-2',
        outcome: 'success',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
  });

  it('covers reservation validation, ambiguity, duplicate, and release paths', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase({
      purchaseId: 'reserve-path-purchase',
      apiKeyUuid: 'key-reserve-paths',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid({
      purchaseId: 'reserve-path-purchase',
      eventId: 'paid-reserve-paths',
    });

    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'missing-attempt',
        eventId: 'missing-event',
        outcome: 'success',
      })
    ).resolves.toEqual({
      status: 404,
      body: { error: 'reservation_not_found' },
    });
    await expect(
      billing.reserveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'reserve-paths',
        pricingSnapshot: snapshot,
      })
    ).resolves.toMatchObject({ body: { status: 'reserved' } });
    await expect(
      billing.reserveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'reserve-paths-duplicate',
        pricingSnapshot: snapshot,
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'other.operation',
        operationAttemptId: 'attempt-paths',
        eventId: 'conflict-event',
        outcome: 'success',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'operation_identity_conflict' },
    });
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'ambiguous-event',
        outcome: 'ambiguous',
      })
    ).resolves.toMatchObject({ body: { status: 'needs_recovery' } });
    await db
      .doc('api-key-credit/key-reserve-paths/reservations/attempt-paths')
      .set({
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        amount: 3,
        allocations: [{ purchaseId: 'reserve-path-purchase', amount: 3 }],
        status: 'needs_recovery',
      });
    await db.doc('api-key-credit/key-reserve-paths').set({});
    await db
      .doc('api-key-credit/key-reserve-paths/lots/reserve-path-purchase')
      .set({});
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'release-event',
        outcome: 'failure',
      })
    ).resolves.toMatchObject({ body: { status: 'released', credit: 3 } });
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'duplicate-release-event',
        outcome: 'failure',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
    await db.doc('api-key-credit/key-reserve-paths/reservations/no-alloc').set({
      operationType: 'function.invoke',
      operationAttemptId: 'no-alloc',
      amount: 0,
      status: 'needs_recovery',
    });
    await expect(
      billing.resolveOperation({
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'no-alloc',
        eventId: 'no-alloc-release',
        outcome: 'failure',
      })
    ).resolves.toMatchObject({ body: { status: 'released' } });
    await expect(
      billing.reserveOperation({
        uuid: 'key-reserve-paths',
        operationType: '',
        operationAttemptId: 'invalid-attempt',
        eventId: 'invalid-event',
        pricingSnapshot: snapshot,
      })
    ).rejects.toThrow('operationType and operationAttemptId are required');
  });

  it('exposes read-only identity reconciliation', async () => {
    const { billing } = setup();
    await expect(billing.reconcileIdentity('missing-key')).resolves.toEqual({
      ok: true,
      discrepancies: [],
    });
  });

  it('rethrows unexpected errors while consuming a credit lot', async () => {
    const lotReference = {};
    const lotDocument = {
      ref: lotReference,
      exists: true,
      data: () => ({ remainingCredits: 1 }),
    };
    const lotCollection = {
      orderBy: () => ({ get: async () => ({ docs: [lotDocument] }) }),
    };
    const creditReference = {
      collection: () => lotCollection,
    };
    const db = {
      collection(name) {
        if (name === 'api-key-credit') return { doc: () => creditReference };
        return {
          doc: () => ({
            collection: () => ({ doc: () => ({}) }),
          }),
        };
      },
      runTransaction(callback) {
        return callback({
          get: async reference => {
            if (reference === lotReference) {
              return {
                exists: true,
                data: () => ({
                  get remainingCredits() {
                    throw new Error('unexpected lot failure');
                  },
                }),
              };
            }
            return { exists: false };
          },
        });
      },
    };
    const billing = createBillingRuntime(db);

    await expect(
      billing.applyOperationCharge({
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-event-1',
        eventId: 'event-1',
        pricingSnapshot: snapshot,
      })
    ).rejects.toThrow('unexpected lot failure');
  });

  it('handles zero-credit and balance-conflict refunds', async () => {
    const { db, billing } = setup();
    await billing.createPurchase({
      purchaseId: 'zero-purchase',
      apiKeyUuid: 'key-zero',
      creditsIssued: 0,
    });
    await billing.markPurchasePaid({
      purchaseId: 'zero-purchase',
      eventId: 'paid-zero',
    });
    await db.doc('api-key-credit/key-zero/lots/zero-purchase').set({});
    await expect(
      billing.applyRefundEvent({
        purchaseId: 'zero-purchase',
        eventId: 'refund-zero',
      })
    ).resolves.toEqual({
      status: 200,
      body: { purchaseId: 'zero-purchase', refunded: false },
    });

    await billing.createPurchase({
      purchaseId: 'conflict-purchase',
      apiKeyUuid: 'key-conflict',
      creditsIssued: 5,
    });
    await billing.markPurchasePaid({
      purchaseId: 'conflict-purchase',
      eventId: 'paid-conflict',
    });
    await db.doc('api-key-credit/key-conflict').set({ credit: 0 });
    await expect(
      billing.applyRefundEvent({
        purchaseId: 'conflict-purchase',
        eventId: 'refund-conflict',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'refund_balance_conflict' },
    });
  });

  it('marks an untouched purchase fully refunded', async () => {
    const { billing } = setup();
    await billing.createPurchase({
      purchaseId: 'untouched-purchase',
      apiKeyUuid: 'key-untouched',
      creditsIssued: 5,
    });
    await billing.markPurchasePaid({
      purchaseId: 'untouched-purchase',
      eventId: 'paid-untouched',
    });

    await expect(
      billing.applyRefundEvent({
        purchaseId: 'untouched-purchase',
        eventId: 'refund-untouched',
      })
    ).resolves.toMatchObject({ body: { refunded: true, creditsReversed: 5 } });
  });

  it('rejects a charge when the aggregate balance is lower than its lot', async () => {
    const { db, billing } = setup();
    await billing.createPurchase({
      purchaseId: 'mismatched-purchase',
      apiKeyUuid: 'key-mismatch',
      creditsIssued: 5,
    });
    await billing.markPurchasePaid({
      purchaseId: 'mismatched-purchase',
      eventId: 'paid-mismatch',
    });
    await db.doc('api-key-credit/key-mismatch/lots/empty-lot').set({});
    await db.doc('api-key-credit/key-mismatch').set({ credit: 0 });

    await expect(
      billing.applyOperationCharge({
        uuid: 'key-mismatch',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-charge-mismatch',
        eventId: 'charge-mismatch',
        pricingSnapshot: snapshot,
      })
    ).resolves.toEqual({ status: 409, body: { error: 'insufficient_credit' } });
  });

  it('handles lots disappearing between listing and transaction reads', async () => {
    const lotReference = {};
    const creditReference = {
      collection: () => ({
        doc: () => lotReference,
        orderBy: () => ({
          get: async () => ({
            docs: [
              {
                ref: lotReference,
                exists: true,
                data: () => ({ remainingCredits: 2 }),
              },
            ],
          }),
        }),
      }),
    };
    const db = {
      collection(name) {
        if (name === 'api-key-credit') return { doc: () => creditReference };
        return { doc: () => ({ collection: () => ({ doc: () => ({}) }) }) };
      },
      runTransaction(callback) {
        let reads = 0;
        const result = callback({
          get: async () => {
            reads += 1;
            if (reads > 1) {
              return { exists: true, data: () => ({ remainingCredits: 0 }) };
            }
            return { exists: false };
          },
        });
        return result.then(value => {
          expect(reads).toBe(3);
          return value;
        });
      },
    };
    const billing = createBillingRuntime(db);

    await expect(
      billing.applyOperationCharge({
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-event-disappeared',
        eventId: 'event-disappeared',
        pricingSnapshot: snapshot,
      })
    ).resolves.toEqual({ status: 409, body: { error: 'insufficient_credit' } });
  });

  it('reads refund lot and balance snapshots through the transaction', async () => {
    const purchaseReference = {};
    const lotReference = {};
    const balanceReference = {
      collection: () => ({ doc: () => lotReference }),
    };
    const db = {
      collection(name) {
        if (name === 'billing-purchases')
          return { doc: () => purchaseReference };
        if (name === 'api-key-credit') {
          return { doc: () => balanceReference };
        }
        return {
          doc: () => ({ collection: () => ({ doc: () => ({}) }) }),
        };
      },
      runTransaction(callback) {
        return callback({
          get: async reference => {
            if (reference === purchaseReference) {
              return {
                exists: true,
                data: () => ({
                  purchaseId: 'purchase-1',
                  apiKeyUuid: 'key-1',
                  creditsIssued: 1,
                }),
              };
            }
            if (reference === lotReference) {
              return { exists: true, data: () => ({ remainingCredits: 1 }) };
            }
            if (reference === balanceReference) {
              return { exists: true, data: () => ({}) };
            }
            return { exists: true, data: () => ({ credit: 1 }) };
          },
          set: jest.fn(),
        });
      },
    };
    const billing = createBillingRuntime(db);

    await expect(
      billing.applyRefundEvent({
        purchaseId: 'purchase-1',
        eventId: 'refund-1',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'refund_balance_conflict' },
    });
  });

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
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-operation-1',
        eventId: 'operation-1',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { applied: true, amount: 3, credit: 7 },
    });
    await expect(
      billing.chargeOperation({
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-operation-1',
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
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-operation-legacy',
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
      operationType: 'function.invoke',
      operationAttemptId: 'attempt-operation-1',
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
