import { describe, expect, it, jest } from '@jest/globals';
import {
  billingRuntimeTestUtils,
  createBillingRuntime,
} from '../../../../src/core/cloud/billing/billing-runtime-core.js';
import { createFakeFirestore } from '../../../../src/core/local/gcp-simulator/fake-firestore.js';
import { createPricingSnapshot } from '../../../../src/core/cloud/billing/pricing-core.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

const allowEffects = createAllowEffects();

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
    billingEnabled: true,
    writeRefundReconciliation: async (_permission, eventId, record) =>
      db.collection('billing-reconciliation').doc(eventId).set(record),
    runBillingTransaction: (_permission, update) => db.runTransaction(update),
  });
  return { db, billing };
}

/**
 * Seed a paid purchase, refundable lot, balance, and current pricing snapshot.
 * @param {any} db Firestore fixture.
 * @param {object} [options] Fixture overrides.
 * @returns {Promise<void>} Resolves after seeding.
 */
async function seedRefundablePurchase(db, options = {}) {
  const input = {
    purchaseId: options.purchaseId ?? 'refund-edge-purchase',
    apiKeyUuid: options.apiKeyUuid ?? 'refund-edge-key',
    status: options.status ?? 'paid',
    amountUsdMinor: options.amountUsdMinor ?? 1000,
    creditsIssued: options.creditsIssued ?? 10,
    remainingCredits: options.remainingCredits ?? 10,
    refundable: options.refundable ?? true,
    includeLot: options.includeLot ?? true,
    pricing: options.pricing ?? {
      ...snapshot,
      snapshotId: 'refund-edge-pricing',
    },
  };
  await db
    .collection('billing-pricing-snapshots')
    .doc(input.pricing.snapshotId)
    .set(input.pricing);
  await db.collection('billing-purchases').doc(input.purchaseId).set({
    purchaseId: input.purchaseId,
    apiKeyUuid: input.apiKeyUuid,
    status: input.status,
    amountUsdMinor: input.amountUsdMinor,
    creditsIssued: input.creditsIssued,
    stripePaymentIntentId: 'pi-refund-edge',
  });
  await db.doc(`api-key-credit/${input.apiKeyUuid}`).set({
    credit: input.remainingCredits,
  });
  if (input.includeLot) {
    await db
      .doc(`api-key-credit/${input.apiKeyUuid}/lots/${input.purchaseId}`)
      .set({
        purchaseId: input.purchaseId,
        issuedCredits: input.creditsIssued,
        remainingCredits: input.remainingCredits,
        refundable: input.refundable,
        createdAt: '2026-08-01T00:00:00.000Z',
      });
  }
}

/**
 * Seed persisted entities for a confirmed refund-event transaction.
 * @param {any} db Firestore fixture.
 * @param {Record<string, any>} [options] Fixture overrides.
 * @returns {Promise<{input: Record<string, any>, suffix: string}>} Event input and identity.
 */
async function seedConfirmedRefundEvent(db, options = {}) {
  const suffix = options.suffix ?? 'confirmed';
  const intentId = `intent-${suffix}`;
  const purchaseId = `purchase-${suffix}`;
  const apiKeyUuid = `key-${suffix}`;
  const base = {
    refundIntentId: intentId,
    purchaseId,
    apiKeyUuid,
    stripePaymentIntentId: 'pi-expected',
    stripeRefundId: 're-expected',
    amountUsdMinor: 500,
    creditsToReverse: 5,
    pricingSnapshotId: 'pricing-1',
    status: 'submitted',
  };
  const eventInput = {
    refundIntentId: intentId,
    purchaseId,
    eventId: `event-${suffix}`,
    stripeRefundId: 're-expected',
    stripePaymentIntentId: 'pi-expected',
    amountUsdMinor: 500,
    currency: 'usd',
    stripeStatus: 'succeeded',
    ...options.input,
  };
  if (options.includeIntent !== false) {
    await db.doc(`billing-refund-intents/${intentId}`).set({
      ...base,
      ...options.intent,
    });
  }
  if (options.includePurchase !== false) {
    await db.doc(`billing-purchases/${purchaseId}`).set({
      purchaseId,
      apiKeyUuid,
      stripePaymentIntentId: 'pi-expected',
      activeRefundIntentId: intentId,
      creditsIssued: 10,
      status: 'paid',
      ...options.purchase,
    });
  }
  if (options.includeLot !== false) {
    await db.doc(`api-key-credit/${apiKeyUuid}/lots/${purchaseId}`).set({
      purchaseId,
      issuedCredits: 10,
      remainingCredits: 5,
      refundable: true,
      ...options.lot,
    });
  }
  if (options.includeBalance !== false) {
    await db.doc(`api-key-credit/${apiKeyUuid}`).set({
      credit: 10,
      ...options.balance,
    });
  }
  return { input: eventInput, suffix };
}

describe('createBillingRuntime', () => {
  it('fails closed for new operation charges and reservations by default', async () => {
    const db = createFakeFirestore();
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      runBillingTransaction: (_permission, update) => db.runTransaction(update),
    });
    const input = {
      uuid: 'key-disabled',
      operationType: 'function.invoke',
      operationAttemptId: 'attempt-disabled',
      eventId: 'event-disabled',
      pricingSnapshot: snapshot,
    };

    await expect(billing.chargeOperation(allowEffects, input)).resolves.toEqual(
      {
        status: 503,
        body: { error: 'billing_disabled' },
      }
    );
    await expect(
      billing.reserveOperation(allowEffects, input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'billing_disabled' },
    });
    await expect(
      billing.applyOperationCharge(allowEffects, input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'billing_disabled' },
    });
    await expect(
      db.collection('api-key-credit').doc('key-disabled').get()
    ).resolves.toMatchObject({ exists: false });
  });

  it('uses the ambiguous fallback when persisting a reservation recovery marker', () => {
    const set = jest.fn();
    const response = billingRuntimeTestUtils.markReservationNeedsRecovery({
      transaction: { set },
      reference: {},
      reservation: {
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-1',
      },
      input: {},
    });
    expect(set.mock.calls[0][1].recoveryReason).toBe('ambiguous');
    expect(response.status).toBe(200);
  });

  it('returns the insufficient-credit result for a lot consumption shortage', () => {
    expect(billingRuntimeTestUtils.consumeLotsOrNull([], 1)).toBeNull();
    expect(() => billingRuntimeTestUtils.consumeLotsOrNull([], 0)).toThrow(
      'positive safe integer'
    );
  });

  it('normalizes operation identities, snapshots, lots, and refund status', async () => {
    expect(
      billingRuntimeTestUtils.readOperationIdentity({
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-1',
      })
    ).toEqual({
      operationType: 'function.invoke',
      operationAttemptId: 'attempt-1',
    });
    expect(() =>
      billingRuntimeTestUtils.readOperationIdentity({ operationType: '' })
    ).toThrow('operationType and operationAttemptId are required');
    expect(() =>
      billingRuntimeTestUtils.readOperationIdentity({
        operationType: 'function.invoke',
        operationAttemptId: '',
      })
    ).toThrow('operationType and operationAttemptId are required');

    expect(billingRuntimeTestUtils.readData({ exists: false })).toEqual({});
    expect(billingRuntimeTestUtils.readData({ exists: true })).toEqual({});
    expect(
      billingRuntimeTestUtils.readData({ exists: true, data: () => null })
    ).toEqual({});
    expect(
      billingRuntimeTestUtils.readData({
        exists: true,
        data: () => ({ ok: true }),
      })
    ).toEqual({ ok: true });
    const firstRef = {};
    const secondRef = {};
    const lotsDb = {
      collection: () => ({
        doc: () => ({
          collection: () => ({
            orderBy: () => ({
              get: async () => ({
                docs: [
                  {
                    ref: firstRef,
                    exists: true,
                    data: () => ({ remainingCredits: 2 }),
                  },
                  {
                    ref: secondRef,
                    exists: true,
                    data: () => ({ remainingCredits: 0 }),
                  },
                ],
              }),
            }),
          }),
        }),
      }),
    };
    await expect(
      billingRuntimeTestUtils.listBillingLots(lotsDb, 'key-lots')
    ).resolves.toEqual([{ ref: firstRef, data: { remainingCredits: 2 } }]);
    expect(billingRuntimeTestUtils.createLegacyLot(3, 'now')).toMatchObject({
      purchaseId: 'legacy',
      issuedCredits: 3,
      remainingCredits: 3,
      refundable: false,
      pricingSnapshotId: 'legacy',
    });
    expect(billingRuntimeTestUtils.resolveRefundStatus(5, 5)).toBe('refunded');
    expect(billingRuntimeTestUtils.resolveRefundStatus(2, 5)).toBe(
      'partially_refunded'
    );
  });

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
    await billing.createPurchase(allowEffects, {
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
    await billing.savePurchaseCheckout(allowEffects, 'purchase-1', {
      checkoutSessionId: 'cs-lookup',
      url: 'https://checkout.test/cs-lookup',
      expiresAt: 456,
    });
    await expect(
      billing.getPurchaseByCheckoutSession('cs-lookup')
    ).resolves.toMatchObject({ checkoutSessionId: 'cs-lookup' });
    await expect(billing.getPurchase('missing')).resolves.toBeNull();

    await billing.savePurchaseCheckout(allowEffects, 'purchase-1', {
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
});

describe('billing runtime snapshot paths', () => {
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
    const { db, billing } = setup();
    const expiryEvent = {
      id: 'expiry-1',
      type: 'checkout.session.expired',
      data: { object: { metadata: { ['purchase_id']: 'pending' } } },
    };
    await billing.createPurchase(allowEffects, {
      purchaseId: 'pending',
      uid: 'uid-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
    });
    await db.doc('payment-events/expiry-1').set({
      status: 'received',
      purchaseId: 'pending',
      verifiedEvent: expiryEvent,
    });
    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'pending',
        eventId: 'expiry-1',
      })
    ).resolves.toMatchObject({ status: 200, body: { status: 'expired' } });
    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'pending',
        eventId: 'expiry-1',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
    expect(
      (await db.doc('payment-events/expiry-1').get()).data()
    ).toMatchObject({ status: 'applied', verifiedEvent: expiryEvent });
    await billing.createPurchase(allowEffects, {
      purchaseId: 'paid',
      uid: 'uid-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
    });
    const verifiedEvent = {
      id: 'payment-1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi-paid' } },
    };
    await db.doc('payment-events/payment-1').set({
      status: 'received',
      purchaseId: 'paid',
      verifiedEvent,
    });
    await billing.markPurchasePaid(allowEffects, {
      purchaseId: 'paid',
      eventId: 'payment-1',
    });
    expect(
      (await db.doc('payment-events/payment-1').get()).data()
    ).toMatchObject({ status: 'applied', verifiedEvent });
    const lateExpiryEvent = {
      id: 'expiry-2',
      type: 'checkout.session.expired',
      data: { object: { metadata: { ['purchase_id']: 'paid' } } },
    };
    await db.doc('payment-events/expiry-2').set({
      status: 'received',
      purchaseId: 'paid',
      verifiedEvent: lateExpiryEvent,
    });
    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'paid',
        eventId: 'expiry-2',
      })
    ).resolves.toMatchObject({ body: { ignored: true, status: 'paid' } });
    expect(
      (await db.doc('payment-events/expiry-2').get()).data()
    ).toMatchObject({ status: 'ignored', verifiedEvent: lateExpiryEvent });
  });

  it('rejects missing expiry events and ignores mismatched retries', async () => {
    const { db, billing } = setup();
    await billing.createPurchase(allowEffects, {
      purchaseId: 'expiry-event-missing',
      apiKeyUuid: 'expiry-event-missing-key',
      creditsIssued: 3,
    });
    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'expiry-event-missing',
        eventId: 'missing-expiry-event',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'payment_event_not_received' },
    });

    await db.doc('billing-purchases/already-expired').set({
      purchaseId: 'already-expired',
      status: 'expired',
      expiredEventId: 'original-expiry-event',
    });
    await db
      .doc('payment-events/retry-expiry-event')
      .set({ status: 'received' });
    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'already-expired',
        eventId: 'retry-expiry-event',
      })
    ).resolves.toEqual({
      status: 200,
      body: { duplicate: true, purchaseId: 'already-expired' },
    });
    expect(
      (await db.doc('payment-events/retry-expiry-event').get()).data()
    ).toMatchObject({ status: 'ignored' });
  });

  it('generates purchase identifiers and normalizes non-object snapshots', async () => {
    const { db, billing } = setup();
    const generated = await billing.createPurchase(allowEffects, {
      apiKeyUuid: 'key-generated',
      creditsIssued: 1,
    });
    expect(generated.purchaseId).toBe('generated-id');
    expect(generated).toMatchObject({
      status: 'pending',
      creditsRemaining: 1,
      refundedUsdMinor: 0,
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
    });

    await db.collection('billing-packages').doc('scalar').set('not-an-object');
    await expect(billing.getPackage('scalar')).resolves.toBe('not-an-object');

    await db
      .collection('billing-purchases')
      .doc('scalar-purchase')
      .set('scalar');
    await expect(billing.getPurchase('scalar-purchase')).resolves.toEqual({});

    const defaultBilling = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
    });
    await expect(
      defaultBilling.createPurchase(allowEffects, {
        apiKeyUuid: 'default-key',
        creditsIssued: 1,
      })
    ).resolves.toMatchObject({ apiKeyUuid: 'default-key', status: 'pending' });
  });

  it('returns not-found results for missing payments', async () => {
    const { billing } = setup();
    await expect(
      billing.markPurchasePaid(allowEffects, {
        purchaseId: 'missing',
        eventId: 'event-1',
      })
    ).resolves.toEqual({ status: 404, body: { error: 'purchase_not_found' } });
  });

  it('does not expose a refund mutation without a persisted refund intent', () => {
    const { billing } = setup();
    expect(billing.applyRefundEvent).toBeUndefined();
  });

  it('creates idempotent refund intents without changing credit balances or lots', async () => {
    const { db, billing } = setup();
    const refundPricing = {
      ...snapshot,
      snapshotId: 'refund-current',
      eurPerUsdMicros: 100_000,
      creditEurMicros: 100,
    };
    await db
      .collection('billing-pricing-snapshots')
      .doc(refundPricing.snapshotId)
      .set(refundPricing);
    const purchases = [
      {
        purchaseId: 'refund-untouched',
        apiKeyUuid: 'refund-key-untouched',
        amountUsdMinor: 1000,
        creditsIssued: 10_000,
        stripePaymentIntentId: 'pi-untouched',
        status: 'paid',
      },
      {
        purchaseId: 'refund-partial',
        apiKeyUuid: 'refund-key-partial',
        amountUsdMinor: 1000,
        creditsIssued: 10_000,
        stripePaymentIntentId: 'pi-partial',
        status: 'paid',
      },
    ];
    for (const purchase of purchases) {
      await db
        .collection('billing-purchases')
        .doc(purchase.purchaseId)
        .set(purchase);
      await db
        .doc(`api-key-credit/${purchase.apiKeyUuid}`)
        .set({ credit: purchase.creditsIssued });
      await db
        .doc(
          `api-key-credit/${purchase.apiKeyUuid}/lots/${purchase.purchaseId}`
        )
        .set({
          purchaseId: purchase.purchaseId,
          issuedCredits: purchase.creditsIssued,
          remainingCredits:
            purchase.purchaseId === 'refund-partial' ? 5000 : 10_000,
          createdAt: '2026-08-01T00:00:00.000Z',
          refundable: true,
        });
    }

    const created = await billing.createRefundIntent(allowEffects, {
      refundIntentId: 'refund-intent-untouched',
      purchaseId: 'refund-untouched',
    });
    expect(created).toMatchObject({
      status: 201,
      body: {
        refundIntent: {
          refundIntentId: 'refund-intent-untouched',
          purchaseId: 'refund-untouched',
          stripePaymentIntentId: 'pi-untouched',
          amountUsdMinor: 1000,
          creditsToReverse: 10_000,
          pricingSnapshotId: 'refund-current',
          status: 'requested',
        },
      },
    });
    const partial = await billing.createRefundIntent(allowEffects, {
      refundIntentId: 'refund-intent-partial',
      purchaseId: 'refund-partial',
    });
    expect(partial).toMatchObject({
      status: 201,
      body: { refundIntent: { amountUsdMinor: 500, creditsToReverse: 5000 } },
    });
    await expect(
      billing.createRefundIntent(allowEffects, {
        refundIntentId: 'refund-intent-partial',
        purchaseId: 'refund-partial',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { duplicate: true },
    });
    await expect(
      billing.createRefundIntent(allowEffects, {
        refundIntentId: 'refund-intent-partial',
        purchaseId: 'refund-untouched',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'refund_intent_conflict' },
    });
    await expect(
      billing.createRefundIntent(allowEffects, {
        refundIntentId: 'another-intent',
        purchaseId: 'refund-partial',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'refund_intent_in_progress' },
    });
    await db
      .collection('billing-pricing-snapshots')
      .doc(refundPricing.snapshotId)
      .delete();
    await expect(
      billing.createRefundIntent(allowEffects, {
        refundIntentId: 'refund-intent-partial',
        purchaseId: 'refund-partial',
      })
    ).resolves.toMatchObject({ status: 200, body: { duplicate: true } });

    expect(
      (await db.doc('api-key-credit/refund-key-untouched').get()).data()
    ).toEqual({ credit: 10_000 });
    expect(
      (
        await db
          .doc('api-key-credit/refund-key-untouched/lots/refund-untouched')
          .get()
      ).data()
    ).toMatchObject({ remainingCredits: 10_000, refundable: true });
    expect(
      (await db.doc('api-key-credit/refund-key-partial').get()).data()
    ).toEqual({ credit: 10_000 });
    expect(
      (
        await db
          .doc('api-key-credit/refund-key-partial/lots/refund-partial')
          .get()
      ).data()
    ).toMatchObject({ remainingCredits: 5000, refundable: true });

    await expect(
      billing.markRefundIntentAmbiguous(allowEffects, 'refund-intent-partial')
    ).resolves.toMatchObject({
      status: 200,
      body: { refundIntent: { status: 'ambiguous' } },
    });
    await expect(
      billing.recordRefundSubmission(allowEffects, {
        refundIntentId: 'refund-intent-partial',
        stripeRefundId: 're-partial',
        stripeStatus: 'pending',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: {
        refundIntent: {
          status: 'submitted',
          stripeRefundId: 're-partial',
          stripeStatus: 'pending',
        },
      },
    });
    expect(
      (
        await db
          .doc('api-key-credit/refund-key-partial/lots/refund-partial')
          .get()
      ).data()
    ).toMatchObject({ remainingCredits: 5000, refundable: true });
  });
});

describe('billing runtime expiry paths', () => {
  it('covers missing expiry, quarantined transitions, and public ledger references', async () => {
    const { db, billing } = setup();
    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'missing',
        eventId: 'expiry-missing',
      })
    ).resolves.toEqual({ status: 404, body: { error: 'purchase_not_found' } });
    await billing.createPurchase(allowEffects, {
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
      billing.markPurchasePaid(allowEffects, {
        purchaseId: 'invalid-state',
        eventId: 'paid-invalid',
      })
    ).resolves.toMatchObject({ body: { quarantined: true } });
    expect(billing.ledgerRef('key-invalid-state', 'event-1')).toBeTruthy();

    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase(allowEffects, {
      purchaseId: 'reserve-insufficient',
      apiKeyUuid: 'key-reserve-insufficient',
      creditsIssued: 1,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid(allowEffects, {
      purchaseId: 'reserve-insufficient',
      eventId: 'paid-reserve-insufficient',
    });
    await expect(
      billing.reserveOperation(allowEffects, {
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
  });
});

describe('billing runtime balance paths', () => {
  it('creates a legacy lot when paying with an existing aggregate balance', async () => {
    const { db, billing } = setup();
    await db.doc('api-key-credit/key-1').set({ credit: 4 });
    await billing.createPurchase(allowEffects, {
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 3,
      pricingSnapshotId: snapshot.snapshotId,
    });

    await expect(
      billing.markPurchasePaid(allowEffects, {
        purchaseId: 'purchase-1',
        eventId: 'paid-1',
      })
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
      billing.chargeOperation(allowEffects, {
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
      billing.chargeOperation(allowEffects, {
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
    await billing.createPurchase(allowEffects, {
      purchaseId: 'reserve-purchase',
      apiKeyUuid: 'key-reserve',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid(allowEffects, {
      purchaseId: 'reserve-purchase',
      eventId: 'paid-reserve',
    });
    const reserved = await billing.reserveOperation(allowEffects, {
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
      billing.resolveOperation(allowEffects, {
        uuid: 'key-reserve',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-reserve-1',
        eventId: 'settle-1',
        outcome: 'success',
      })
    ).resolves.toMatchObject({ body: { status: 'settled' } });
    await expect(
      billing.resolveOperation(allowEffects, {
        uuid: 'key-reserve',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-reserve-1',
        eventId: 'settle-2',
        outcome: 'success',
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
  });
});

describe('billing runtime reservation paths', () => {
  it('covers reservation validation, ambiguity, duplicate, and release paths', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase(allowEffects, {
      purchaseId: 'reserve-path-purchase',
      apiKeyUuid: 'key-reserve-paths',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid(allowEffects, {
      purchaseId: 'reserve-path-purchase',
      eventId: 'paid-reserve-paths',
    });

    await expect(
      billing.resolveOperation(allowEffects, {
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
      billing.reserveOperation(allowEffects, {
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'reserve-paths',
        pricingSnapshot: snapshot,
      })
    ).resolves.toMatchObject({ body: { status: 'reserved' } });
    await expect(
      billing.reserveOperation(allowEffects, {
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'reserve-paths-duplicate',
        pricingSnapshot: snapshot,
      })
    ).resolves.toMatchObject({ body: { duplicate: true } });
    await expect(
      billing.resolveOperation(allowEffects, {
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
      billing.resolveOperation(allowEffects, {
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
      billing.resolveOperation(allowEffects, {
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-paths',
        eventId: 'release-event',
        outcome: 'failure',
      })
    ).resolves.toMatchObject({ body: { status: 'released', credit: 3 } });
    await expect(
      billing.resolveOperation(allowEffects, {
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
      billing.resolveOperation(allowEffects, {
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: 'no-alloc',
        eventId: 'no-alloc-release',
        outcome: 'failure',
      })
    ).resolves.toMatchObject({ body: { status: 'released' } });
    await expect(
      billing.reserveOperation(allowEffects, {
        uuid: 'key-reserve-paths',
        operationType: '',
        operationAttemptId: 'invalid-attempt',
        eventId: 'invalid-event',
        pricingSnapshot: snapshot,
      })
    ).rejects.toThrow('operationType and operationAttemptId are required');
    await expect(
      billing.reserveOperation(allowEffects, {
        uuid: 'key-reserve-paths',
        operationType: 'function.invoke',
        operationAttemptId: '',
        eventId: 'invalid-attempt-empty',
        pricingSnapshot: snapshot,
      })
    ).rejects.toThrow('operationType and operationAttemptId are required');
  });
});

describe('billing runtime reconciliation paths', () => {
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
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      billingEnabled: true,
      runBillingTransaction: (_permission, update) => db.runTransaction(update),
    });

    await expect(
      billing.applyOperationCharge(allowEffects, {
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-event-1',
        eventId: 'event-1',
        pricingSnapshot: snapshot,
      })
    ).rejects.toThrow('unexpected lot failure');
  });

  it('rejects a charge when the aggregate balance is lower than its lot', async () => {
    const { db, billing } = setup();
    await billing.createPurchase(allowEffects, {
      purchaseId: 'mismatched-purchase',
      apiKeyUuid: 'key-mismatch',
      creditsIssued: 5,
    });
    await billing.markPurchasePaid(allowEffects, {
      purchaseId: 'mismatched-purchase',
      eventId: 'paid-mismatch',
    });
    await db.doc('api-key-credit/key-mismatch/lots/empty-lot').set({});
    await db.doc('api-key-credit/key-mismatch').set({ credit: 0 });

    await expect(
      billing.applyOperationCharge(allowEffects, {
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
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      billingEnabled: true,
      runBillingTransaction: (_permission, update) => db.runTransaction(update),
    });

    await expect(
      billing.applyOperationCharge(allowEffects, {
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'attempt-event-disappeared',
        eventId: 'event-disappeared',
        pricingSnapshot: snapshot,
      })
    ).resolves.toEqual({ status: 409, body: { error: 'insufficient_credit' } });
  });
});

describe('billing runtime refund paths', () => {
  it('issues a purchase into a refundable lot exactly once', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase(allowEffects, {
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 100,
      pricingSnapshotId: snapshot.snapshotId,
    });

    await expect(
      billing.markPurchasePaid(allowEffects, {
        purchaseId: 'purchase-1',
        eventId: 'payment-1',
        stripePaymentIntentId: 'pi-1',
      })
    ).resolves.toMatchObject({ status: 201 });
    await expect(
      billing.markPurchasePaid(allowEffects, {
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
});

describe('billing runtime charging paths', () => {
  it('charges operations from FIFO lots using the current snapshot', async () => {
    const { db, billing } = setup();
    await db
      .collection('billing-pricing-snapshots')
      .doc(snapshot.snapshotId)
      .set(snapshot);
    await billing.createPurchase(allowEffects, {
      purchaseId: 'purchase-1',
      apiKeyUuid: 'key-1',
      creditsIssued: 10,
      pricingSnapshotId: snapshot.snapshotId,
    });
    await billing.markPurchasePaid(allowEffects, {
      purchaseId: 'purchase-1',
      eventId: 'paid-1',
      stripePaymentIntentId: 'pi-1',
    });

    await expect(
      billing.chargeOperation(allowEffects, {
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
      billing.chargeOperation(allowEffects, {
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
      billing.applyOperationCharge(allowEffects, {
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

  it('forwards the request capability to the injected refund reconciliation writer', async () => {
    const db = createFakeFirestore();
    const writeRefundReconciliation = jest.fn().mockResolvedValue(undefined);
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      now: () => new Date('2026-10-12T00:00:00.000Z'),
      writeRefundReconciliation,
    });
    const input = {
      eventId: 'refund-adapter-event',
      purchaseId: 'purchase-1',
      stripePaymentIntentId: 'pi-1',
      chargeId: 'ch-1',
      refundedUsdMinor: 500,
    };

    await billing.recordRefundReconciliation(allowEffects, input);

    expect(writeRefundReconciliation).toHaveBeenCalledWith(
      allowEffects,
      'refund-adapter-event',
      {
        type: 'unmatched_stripe_refund',
        status: 'pending',
        ...input,
        recordedAt: new Date('2026-10-12T00:00:00.000Z'),
      }
    );
    await expect(
      db.doc('billing-reconciliation/refund-adapter-event').get()
    ).resolves.toMatchObject({ exists: false });
  });

  it('fails closed when refund reconciliation has no persistence adapter', async () => {
    const billing = createBillingRuntime(createFakeFirestore(), {
      randomUUID: () => 'generated-id',
    });

    await expect(
      billing.recordRefundReconciliation(allowEffects, {
        eventId: 'refund-without-adapter',
        purchaseId: 'purchase-1',
        stripePaymentIntentId: 'pi-1',
        chargeId: 'ch-1',
        refundedUsdMinor: 500,
      })
    ).rejects.toThrow('writeRefundReconciliation adapter must be provided');
  });

  it('forwards the request capability to the purchase transaction runner', async () => {
    const db = createFakeFirestore();
    const runBillingTransaction = jest.fn((_permission, update) =>
      db.runTransaction(update)
    );
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      billingEnabled: true,
      runBillingTransaction,
    });
    await billing.createPurchase(allowEffects, {
      purchaseId: 'purchase-through-adapter',
      apiKeyUuid: 'key-through-adapter',
      creditsIssued: 4,
      pricingSnapshotId: snapshot.snapshotId,
    });

    await expect(
      billing.markPurchasePaid(allowEffects, {
        purchaseId: 'purchase-through-adapter',
        eventId: 'payment-through-adapter',
        stripePaymentIntentId: 'pi-through-adapter',
      })
    ).resolves.toMatchObject({ status: 201 });
    expect(runBillingTransaction).toHaveBeenCalledWith(
      allowEffects,
      expect.any(Function)
    );
  });

  it('fails closed when a purchase transaction runner is absent', async () => {
    const billing = createBillingRuntime(createFakeFirestore(), {
      randomUUID: () => 'generated-id',
    });

    await expect(
      billing.markPurchaseExpired(allowEffects, {
        purchaseId: 'purchase-without-runner',
        eventId: 'expiry-without-runner',
      })
    ).rejects.toThrow('runBillingTransaction adapter must be provided');
  });

  it('forwards the request capability to operation resolution transactions', async () => {
    const db = createFakeFirestore();
    const runBillingTransaction = jest.fn((_permission, update) =>
      db.runTransaction(update)
    );
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      runBillingTransaction,
    });

    await expect(
      billing.resolveOperation(allowEffects, {
        uuid: 'key-1',
        operationType: 'function.invoke',
        operationAttemptId: 'missing-attempt',
        outcome: 'success',
      })
    ).resolves.toEqual({
      status: 404,
      body: { error: 'reservation_not_found' },
    });
    expect(runBillingTransaction).toHaveBeenCalledWith(
      allowEffects,
      expect.any(Function)
    );
  });

  it('forwards the request capability to operation charge and reservation transactions', async () => {
    const db = createFakeFirestore();
    const runBillingTransaction = jest.fn((_permission, update) =>
      db.runTransaction(update)
    );
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      billingEnabled: true,
      runBillingTransaction,
    });
    const input = {
      uuid: 'key-1',
      operationType: 'function.invoke',
      operationAttemptId: 'attempt-through-adapter',
      eventId: 'event-through-adapter',
      pricingSnapshot: snapshot,
    };

    await billing.applyOperationCharge(allowEffects, input);
    await billing.reserveOperation(allowEffects, input);

    expect(runBillingTransaction).toHaveBeenCalledTimes(2);
    expect(runBillingTransaction).toHaveBeenNthCalledWith(
      1,
      allowEffects,
      expect.any(Function)
    );
    expect(runBillingTransaction).toHaveBeenNthCalledWith(
      2,
      allowEffects,
      expect.any(Function)
    );
  });
});

describe('billing runtime confirmed refund intent events', () => {
  it('covers invalid, unavailable, raced, and non-refundable intent creation', async () => {
    const { billing: emptyBilling } = setup();
    await expect(
      emptyBilling.createRefundIntent(allowEffects, {
        refundIntentId: '',
        purchaseId: 'purchase-invalid',
      })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'invalid_refund_intent' },
    });
    await expect(
      emptyBilling.createRefundIntent(allowEffects, {
        refundIntentId: 'intent-no-pricing',
        purchaseId: 'purchase-no-pricing',
      })
    ).resolves.toEqual({
      status: 503,
      body: { error: 'pricing_unavailable' },
    });

    const missingPurchase = setup();
    await seedRefundablePurchase(missingPurchase.db, {
      purchaseId: 'purchase-missing-later',
    });
    await missingPurchase.db
      .collection('billing-purchases')
      .doc('purchase-missing-later')
      .delete();
    await expect(
      missingPurchase.billing.createRefundIntent(allowEffects, {
        refundIntentId: 'intent-missing-purchase',
        purchaseId: 'purchase-missing-later',
      })
    ).resolves.toEqual({
      status: 404,
      body: { error: 'purchase_not_found' },
    });

    for (const [suffix, racedPurchaseId, expected] of [
      [
        'duplicate',
        'purchase-raced',
        { status: 200, body: { duplicate: true } },
      ],
      [
        'conflict',
        'purchase-other',
        { status: 409, body: { error: 'refund_intent_conflict' } },
      ],
    ]) {
      const db = createFakeFirestore();
      const refundIntentId = `intent-race-${suffix}`;
      const raceBilling = createBillingRuntime(db, {
        randomUUID: () => 'generated-id',
        now: () => new Date('2026-08-05T00:00:00.000Z'),
        runBillingTransaction: async (_permission, update) => {
          await db.doc(`billing-refund-intents/${refundIntentId}`).set({
            refundIntentId,
            purchaseId: racedPurchaseId,
            status: 'requested',
          });
          return db.runTransaction(update);
        },
      });
      await db
        .collection('billing-pricing-snapshots')
        .doc(snapshot.snapshotId)
        .set(snapshot);
      await expect(
        raceBilling.createRefundIntent(allowEffects, {
          refundIntentId,
          purchaseId: 'purchase-raced',
        })
      ).resolves.toMatchObject(expected);
    }

    const notRefundable = setup();
    await seedRefundablePurchase(notRefundable.db, {
      purchaseId: 'purchase-pending-refund',
      status: 'pending',
    });
    await expect(
      notRefundable.billing.createRefundIntent(allowEffects, {
        refundIntentId: 'intent-pending-refund',
        purchaseId: 'purchase-pending-refund',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'purchase_not_refundable' },
    });

    const missingLot = setup();
    await seedRefundablePurchase(missingLot.db, {
      purchaseId: 'purchase-no-lot',
      includeLot: false,
    });
    await expect(
      missingLot.billing.createRefundIntent(allowEffects, {
        refundIntentId: 'intent-no-lot',
        purchaseId: 'purchase-no-lot',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'no_refundable_credits' },
    });

    const noAmount = setup();
    await seedRefundablePurchase(noAmount.db, {
      purchaseId: 'purchase-no-refund-amount',
      creditsIssued: 1,
      remainingCredits: 1,
      pricing: {
        ...snapshot,
        snapshotId: 'refund-zero-price',
        eurPerUsdMicros: 100_000,
        creditEurMicros: 1,
      },
    });
    await expect(
      noAmount.billing.createRefundIntent(allowEffects, {
        refundIntentId: 'intent-no-refund-amount',
        purchaseId: 'purchase-no-refund-amount',
      })
    ).resolves.toEqual({
      status: 409,
      body: { error: 'no_refundable_amount' },
    });
  });

  it('covers missing and duplicate refund submission and ambiguity records', async () => {
    const { db, billing } = setup();
    await expect(
      billing.recordRefundSubmission(allowEffects, {
        refundIntentId: 'intent-absent',
        stripeRefundId: 're-absent',
        stripeStatus: 'pending',
      })
    ).resolves.toEqual({
      status: 404,
      body: { error: 'refund_intent_not_found' },
    });
    await expect(
      billing.markRefundIntentAmbiguous(allowEffects, 'intent-absent')
    ).resolves.toEqual({
      status: 404,
      body: { error: 'refund_intent_not_found' },
    });
    await db.doc('billing-refund-intents/intent-submitted').set({
      refundIntentId: 'intent-submitted',
      status: 'submitted',
    });
    await expect(
      billing.markRefundIntentAmbiguous(allowEffects, 'intent-submitted')
    ).resolves.toMatchObject({
      status: 200,
      body: { duplicate: true },
    });
    await db.doc('billing-refund-intents/intent-applied').set({
      refundIntentId: 'intent-applied',
      status: 'applied',
    });
    await expect(
      billing.recordRefundSubmission(allowEffects, {
        refundIntentId: 'intent-applied',
        stripeRefundId: 're-applied',
        stripeStatus: 'succeeded',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { duplicate: true },
    });
  });

  it('quarantines missing, conflicting, stale, and invalid refund state', async () => {
    for (const options of [
      {
        suffix: 'state',
        intent: { status: 'failed' },
        reason: 'refund_intent_state_conflict',
      },
      {
        suffix: 'purchase-missing',
        includePurchase: false,
        reason: 'purchase_not_found',
      },
      {
        suffix: 'purchase-conflict',
        purchase: { activeRefundIntentId: 'different-intent' },
        reason: 'purchase_refund_state_conflict',
      },
      {
        suffix: 'key-conflict',
        purchase: { apiKeyUuid: 'other-key' },
        reason: 'purchase_refund_state_conflict',
      },
      {
        suffix: 'lot-missing',
        includeLot: false,
        reason: 'refund_lot_mismatch',
      },
      {
        suffix: 'lot-stale',
        lot: { remainingCredits: 4 },
        reason: 'refund_lot_mismatch',
      },
      {
        suffix: 'balance',
        balance: { credit: 0 },
        reason: 'refund_balance_conflict',
      },
      {
        suffix: 'balance-missing',
        includeBalance: false,
        reason: 'refund_balance_conflict',
      },
      {
        suffix: 'balance-invalid',
        balance: { credit: 'invalid' },
        reason: 'refund_balance_conflict',
      },
      {
        suffix: 'transition',
        purchase: { status: 'partially_refunded', creditsIssued: 10 },
        reason: 'purchase_transition_invalid',
      },
    ]) {
      const { db, billing } = setup();
      const { input, suffix } = await seedConfirmedRefundEvent(db, options);
      await expect(
        billing.applyRefundIntentEvent(allowEffects, input)
      ).resolves.toMatchObject({
        body: { quarantined: true, reason: options.reason },
      });
      if (options.includeBalance !== false) {
        const balance = await db.doc(`api-key-credit/key-${suffix}`).get();
        expect(balance.data()).toEqual(
          expect.objectContaining(options.balance ?? { credit: 10 })
        );
      }
    }

    const malformed = setup();
    const { input } = await seedConfirmedRefundEvent(malformed.db, {
      suffix: 'intent-applied-mismatch',
      intent: { status: 'applied' },
    });
    await expect(
      malformed.billing.applyRefundIntentEvent(allowEffects, {
        ...input,
        amountUsdMinor: 501,
      })
    ).resolves.toMatchObject({
      body: { quarantined: true, reason: 'refund_intent_mismatch' },
    });
  });

  it('applies a matching successful refund once, including a second event id', async () => {
    const { db, billing } = setup();
    await db.doc('billing-refund-intents/intent-1').set({
      refundIntentId: 'intent-1',
      purchaseId: 'purchase-refund-1',
      apiKeyUuid: 'refund-key-1',
      stripePaymentIntentId: 'pi-refund-1',
      stripeRefundId: 're-1',
      amountUsdMinor: 500,
      creditsToReverse: 50,
      pricingSnapshotId: 'pricing-1',
      status: 'submitted',
    });
    await db.doc('billing-purchases/purchase-refund-1').set({
      purchaseId: 'purchase-refund-1',
      apiKeyUuid: 'refund-key-1',
      stripePaymentIntentId: 'pi-refund-1',
      activeRefundIntentId: 'intent-1',
      creditsIssued: 100,
      status: 'paid',
    });
    await db.doc('api-key-credit/refund-key-1').set({ credit: 100 });
    await db.doc('api-key-credit/refund-key-1/lots/purchase-refund-1').set({
      purchaseId: 'purchase-refund-1',
      issuedCredits: 100,
      remainingCredits: 50,
      refundable: true,
    });
    const input = {
      refundIntentId: 'intent-1',
      purchaseId: 'purchase-refund-1',
      eventId: 'evt-refund-1',
      stripeRefundId: 're-1',
      stripePaymentIntentId: 'pi-refund-1',
      amountUsdMinor: 500,
      currency: 'usd',
      stripeStatus: 'succeeded',
    };
    const verifiedEvent = {
      id: input.eventId,
      type: 'refund.updated',
      data: { object: { id: input.stripeRefundId } },
    };
    await db.doc(`payment-events/${input.eventId}`).set({
      status: 'deferred',
      purchaseId: input.purchaseId,
      verifiedEvent,
    });

    await expect(
      billing.applyRefundIntentEvent(allowEffects, {
        ...input,
        eventId: 'evt-refund-pending',
        stripeStatus: 'pending',
      })
    ).resolves.toEqual({
      status: 200,
      body: {
        deferred: true,
        refundIntentId: 'intent-1',
        stripeRefundId: 're-1',
      },
    });

    await expect(
      billing.applyRefundIntentEvent(allowEffects, input)
    ).resolves.toEqual({
      status: 200,
      body: {
        applied: true,
        purchaseId: 'purchase-refund-1',
        refundIntentId: 'intent-1',
        creditsReversed: 50,
      },
    });
    await expect(
      billing.applyRefundIntentEvent(allowEffects, {
        ...input,
        eventId: 'evt-refund-duplicate-delivery',
      })
    ).resolves.toEqual({
      status: 200,
      body: { duplicate: true, refundIntentId: 'intent-1' },
    });
    await expect(
      billing.applyRefundIntentEvent(allowEffects, {
        ...input,
        eventId: 'evt-refund-pending',
        stripeStatus: 'pending',
      })
    ).resolves.toEqual({
      status: 200,
      body: { duplicate: true, refundIntentId: 'intent-1' },
    });
    await expect(
      billing.applyRefundIntentEvent(allowEffects, {
        ...input,
        eventId: 'evt-refund-tampered-replay',
        amountUsdMinor: 501,
      })
    ).resolves.toMatchObject({
      body: { quarantined: true, reason: 'refund_intent_mismatch' },
    });
    await expect(
      db.doc('api-key-credit/refund-key-1').get()
    ).resolves.toMatchObject({
      data: expect.any(Function),
    });
    expect(
      (await db.doc('api-key-credit/refund-key-1').get()).data()
    ).toMatchObject({
      credit: 50,
      lastEventId: 'evt-refund-1',
    });
    expect(
      (
        await db.doc('api-key-credit/refund-key-1/lots/purchase-refund-1').get()
      ).data()
    ).toMatchObject({ remainingCredits: 0, refundable: false });
    expect(
      (await db.doc('billing-refund-intents/intent-1').get()).data()
    ).toMatchObject({ status: 'applied', appliedEventId: 'evt-refund-1' });
    expect(
      (await db.doc(`payment-events/${input.eventId}`).get()).data()
    ).toMatchObject({ status: 'applied', verifiedEvent });
  });

  it('quarantines identity and amount mismatches without changing credits', async () => {
    for (const [suffix, change, reason] of [
      ['intent', { refundIntentId: 'other-intent' }, 'refund_intent_not_found'],
      ['purchase', { purchaseId: 'other-purchase' }, 'refund_intent_mismatch'],
      [
        'payment',
        { stripePaymentIntentId: 'pi-other' },
        'refund_intent_mismatch',
      ],
      ['amount', { amountUsdMinor: 501 }, 'refund_intent_mismatch'],
      ['refund-id', { stripeRefundId: 're-other' }, 'refund_intent_mismatch'],
      ['currency', { currency: 'eur' }, 'refund_intent_mismatch'],
      ['status', { stripeStatus: 'failed' }, 'refund_intent_mismatch'],
    ]) {
      const { db, billing } = setup();
      await db.doc(`billing-refund-intents/intent-${suffix}`).set({
        refundIntentId: `intent-${suffix}`,
        purchaseId: `purchase-${suffix}`,
        apiKeyUuid: `key-${suffix}`,
        stripePaymentIntentId: 'pi-expected',
        stripeRefundId: 're-expected',
        amountUsdMinor: 500,
        creditsToReverse: 5,
        pricingSnapshotId: 'pricing-1',
        status: 'submitted',
      });
      await db.doc(`billing-purchases/purchase-${suffix}`).set({
        purchaseId: `purchase-${suffix}`,
        apiKeyUuid: `key-${suffix}`,
        stripePaymentIntentId: 'pi-expected',
        activeRefundIntentId: `intent-${suffix}`,
        creditsIssued: 10,
        status: 'paid',
      });
      await db.doc(`api-key-credit/key-${suffix}`).set({ credit: 10 });
      await db.doc(`api-key-credit/key-${suffix}/lots/purchase-${suffix}`).set({
        purchaseId: `purchase-${suffix}`,
        issuedCredits: 10,
        remainingCredits: 5,
        refundable: true,
      });
      const response = await billing.applyRefundIntentEvent(allowEffects, {
        refundIntentId: `intent-${suffix}`,
        purchaseId: `purchase-${suffix}`,
        eventId: `event-${suffix}`,
        stripeRefundId: 're-expected',
        stripePaymentIntentId: 'pi-expected',
        amountUsdMinor: 500,
        currency: 'usd',
        stripeStatus: 'succeeded',
        ...change,
      });
      expect(response.body).toMatchObject({
        quarantined: true,
        reason,
      });
      expect(
        (await db.doc(`api-key-credit/key-${suffix}`).get()).data()
      ).toEqual({
        credit: 10,
      });
      expect(
        (
          await db
            .doc(`api-key-credit/key-${suffix}/lots/purchase-${suffix}`)
            .get()
        ).data()
      ).toMatchObject({ remainingCredits: 5, refundable: true });
    }
  });
});
