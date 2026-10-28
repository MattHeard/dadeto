import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';
import { createMarkProcessedEventWriter } from '../../../../src/cloud/payment-webhook/effect-adapters.js';
import { createBillingRuntime } from '../../../../src/core/cloud/billing/billing-runtime-core.js';
import { createPaymentWebhookIndexHandler } from '../../../../src/core/cloud/payment-webhook/payment-webhook-core.js';
import { createFakeFirestore } from '../../../../src/core/local/gcp-simulator/fake-firestore.js';

const allowEffects = createAllowEffects();

/**
 * Create a production-shaped payment webhook handler over the fake database.
 * @param {ReturnType<typeof createFakeFirestore>} db Test database.
 * @param {{ failAfterApply?: boolean }} [options] Simulated process failure.
 * @returns {ReturnType<typeof createPaymentWebhookIndexHandler>} Handler.
 */
function createHandler(db, options = {}) {
  const writeProcessedEvent = createMarkProcessedEventWriter(db);
  return createPaymentWebhookIndexHandler({
    randomUUID: () => 'generated-id',
    db,
    env: { STRIPE_WEBHOOK_SECRET: 'secret' },
    constructEvent: payload => JSON.parse(payload.toString()),
    creditEventEffects: {},
    readDeferredPaymentEvents: async () => [],
    markProcessedEvent: async (permission, event, uuid, status) => {
      if (options.failAfterApply && status === 'applied')
        throw new Error('simulated process interruption after transaction');
      return writeProcessedEvent(permission, event, uuid, status);
    },
    writeRefundReconciliation: async (_permission, eventId, record) =>
      db.collection('billing-reconciliation').doc(eventId).set(record),
    runBillingTransaction: (_permission, update) => db.runTransaction(update),
    sendResponse: (_permission, response, result) =>
      response.status(result.status).json(result.body),
    logError: () => {},
  });
}

/**
 * Submit one signed provider event to the webhook handler.
 * @param {ReturnType<typeof createPaymentWebhookIndexHandler>} handler Webhook.
 * @param {object} event Verified event fixture.
 * @returns {Promise<{statusCode: number, body: object}>} HTTP response.
 */
async function submitEvent(handler, event) {
  const response = {
    statusCode: 0,
    body: {},
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handler(
    allowEffects,
    {
      rawBody: JSON.stringify(event),
      headers: { 'stripe-signature': 'signed' },
    },
    response
  );
  return response;
}

/**
 * Build a verified Stripe checkout-expiry event.
 * @param {string} id Provider event id.
 * @param {string} purchaseId Purchase metadata.
 * @returns {object} Verified event fixture.
 */
function expiryEvent(id, purchaseId) {
  return {
    id,
    type: 'checkout.session.expired',
    data: { object: { metadata: { ['purchase_id']: purchaseId } } },
  };
}

describe('billing expiry inbox transactions', () => {
  it('keeps expiry applied across handler restart and quarantines late payment', async () => {
    const db = createFakeFirestore();
    const billing = createBillingRuntime(db, {
      randomUUID: () => 'generated-id',
      billingEnabled: true,
      runBillingTransaction: (_permission, update) => db.runTransaction(update),
    });
    await billing.createPurchase(allowEffects, {
      purchaseId: 'expiry-restart',
      apiKeyUuid: 'expiry-restart-key',
      creditsIssued: 11,
    });

    const expiry = expiryEvent('evt-expiry-restart', 'expiry-restart');
    await expect(
      submitEvent(createHandler(db, { failAfterApply: true }), expiry)
    ).rejects.toThrow('simulated process interruption after transaction');
    expect(
      (await db.doc('billing-purchases/expiry-restart').get()).data()
    ).toMatchObject({
      status: 'expired',
      expiredEventId: 'evt-expiry-restart',
    });
    expect(
      (await db.doc('payment-events/evt-expiry-restart').get()).data()
    ).toMatchObject({ status: 'applied', verifiedEvent: expiry });

    await expect(submitEvent(createHandler(db), expiry)).resolves.toMatchObject(
      { statusCode: 200, body: { duplicate: true } }
    );
    expect(
      (await db.doc('payment-events/evt-expiry-restart').get()).data()
    ).toMatchObject({ status: 'applied', verifiedEvent: expiry });

    const interruptedExpiry = expiryEvent(
      'evt-interrupted-expiry',
      'already-expired'
    );
    await db.doc('billing-purchases/already-expired').set({
      purchaseId: 'already-expired',
      status: 'expired',
      expiredEventId: 'evt-interrupted-expiry',
    });
    await db.doc('payment-events/evt-interrupted-expiry').set({
      status: 'received',
      verifiedEvent: interruptedExpiry,
    });
    await expect(
      submitEvent(createHandler(db), interruptedExpiry)
    ).resolves.toMatchObject({
      statusCode: 200,
      body: { status: 'expired', applied: true },
    });
    expect(
      (await db.doc('payment-events/evt-interrupted-expiry').get()).data()
    ).toMatchObject({ status: 'applied', verifiedEvent: interruptedExpiry });

    const latePayment = {
      id: 'evt-payment-after-expiry',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi-late',
          metadata: { ['purchase_id']: 'expiry-restart' },
        },
      },
    };
    await expect(
      submitEvent(createHandler(db), latePayment)
    ).resolves.toMatchObject({
      statusCode: 200,
      body: { quarantined: true, purchaseId: 'expiry-restart' },
    });
    expect(
      (await db.doc('billing-purchases/expiry-restart').get()).data()
    ).toMatchObject({
      status: 'expired',
      expiredEventId: 'evt-expiry-restart',
    });
    expect(
      (await db.doc('payment-events/evt-payment-after-expiry').get()).data()
    ).toMatchObject({ status: 'quarantined', verifiedEvent: latePayment });
    await expect(
      db.doc('api-key-credit/expiry-restart-key').get()
    ).resolves.toMatchObject({ exists: false });
  });
});
