/* eslint-disable jsdoc/reject-any-type */
import {
  createApplyCreditEvent,
  createFetchCredit,
} from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import { createDb } from '../get-api-key-credit-v2/create-db.js';
import {
  createPaymentWebhookHandler,
  createResolveApiKeyUuid,
  extractHeader,
  extractRawPayload,
  parseJsonEvent,
  readMetadata,
} from '../../payment-webhook-core.js';
import { createBillingRuntime } from '../billing/billing-runtime-core.js';

/** @typedef {typeof import('@google-cloud/firestore').Firestore} FirestoreCtor */
/** @typedef {Record<string, string | undefined>} ProcessEnvLike */

/**
 * Create the payment webhook request handler used by the cloud wrapper.
 * @param {{ firestore: FirestoreCtor, env?: ProcessEnvLike, constructEvent?: (payload: string|Buffer, signature: string, secret: string) => unknown }} deps Dependencies for the wrapper.
 * @returns {(req: unknown, res: unknown) => Promise<unknown>} Request handler.
 */
export function createPaymentWebhookIndexHandler({
  firestore,
  env = process.env,
  constructEvent,
}) {
  const db = /** @type {any} */ (createDb(firestore, env));
  const billing = createBillingRuntime(db);
  const handleRequest = createPaymentWebhookHandler({
    fetchCredit: createFetchCredit(db),
    applyCreditEvent: createApplyCreditEvent(db),
    resolveApiKeyUuid: createResolveApiKeyUuid({
      findApiKeyUuidByCustomerId: async customerId => {
        const snap = await db
          .collection('payment-customers')
          .doc(customerId)
          .get();
        const apiKeyUuid = snap.data()?.apiKeyUuid;
        if (typeof apiKeyUuid === 'string' && apiKeyUuid) {
          return apiKeyUuid;
        }

        return null;
      },
    }),
    handlePurchaseEvent: event => handlePurchaseEvent(billing, event),
    isDuplicateEvent: async eventId =>
      (await db.collection('payment-events').doc(eventId).get()).exists,
    markProcessedEvent: async (event, uuid) => {
      const doc = db.collection('payment-events').doc(event.id);
      let createdAtMs = Date.now();
      if (typeof event.created === 'number') {
        createdAtMs = event.created * 1000;
      }
      await /** @type {{ set: (value: { apiKeyUuid: string, type: string, createdAt: Date }) => Promise<void> }} */ (
        /** @type {unknown} */ (doc)
      ).set({
        apiKeyUuid: uuid,
        type: event.type,
        createdAt: new Date(createdAtMs),
      });
    },
    getPaymentEvent: async request =>
      parseStripePaymentWebhookEvent(request, env, constructEvent),
  });

  return async function handle(req, res) {
    const response = await handlePaymentWebhookRequest(handleRequest, req);
    return sendPaymentWebhookResponse(/** @type {any} */ (res), response);
  };
}

/**
 * Resolve a Stripe event against the purchase ledger.
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse | null>} Response or null.
 */
async function handlePurchaseEvent(billing, event) {
  const metadata = readMetadata(event.data?.object ?? {});
  if (!metadata.purchase_id) return null;
  if (event.type === 'checkout.session.completed')
    return handleCheckoutCompleted(billing, metadata, event);
  if (event.type === 'checkout.session.expired')
    return billing.markPurchaseExpired({
      purchaseId: metadata.purchase_id,
      eventId: event.id,
    });
  if (event.type === 'payment_intent.succeeded')
    return handlePaymentIntentSucceeded(billing, metadata, event);
  if (event.type === 'charge.refunded')
    return handleChargeRefunded(billing, metadata, event);
  return null;
}

/**
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Record<string, string>} metadata Stripe metadata.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse|null>} Response.
 */
async function handleCheckoutCompleted(billing, metadata, event) {
  if (event.data?.object?.payment_status !== 'paid') return null;
  return billing.markPurchasePaid({
    purchaseId: metadata.purchase_id,
    eventId: event.id,
    stripePaymentIntentId: String(event.data?.object?.payment_intent ?? ''),
  });
}

/**
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Record<string, string>} metadata Stripe metadata.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse>} Response.
 */
async function handlePaymentIntentSucceeded(billing, metadata, event) {
  return billing.markPurchasePaid({
    purchaseId: metadata.purchase_id,
    eventId: event.id,
    stripePaymentIntentId: event.id,
  });
}

/**
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Record<string, string>} metadata Stripe metadata.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse>} Response.
 */
async function handleChargeRefunded(billing, metadata, event) {
  return billing.applyRefundEvent({
    purchaseId: metadata.purchase_id,
    eventId: event.id,
    refundedUsdMinor: Number(event.data?.object?.amount_refunded ?? 0),
    pricingSnapshotId: metadata.pricing_snapshot_id ?? '',
  });
}

/**
 * Parse a payment webhook request body with optional signature validation.
 * @param {unknown} request Incoming request.
 * @param {ProcessEnvLike} [env] Environment values.
 * @returns {import('../../payment-webhook-core.js').PaymentEvent} Parsed event.
 */
export function parsePaymentWebhookEvent(request, env = process.env) {
  return parseStripePaymentWebhookEvent(request, env, null);
}

/**
 * Verify a Stripe webhook before parsing it into the generic payment domain model.
 * @param {unknown} request Incoming request.
 * @param {ProcessEnvLike} env Environment values.
 * @param {((payload: string | Buffer, signature: string, secret: string) => unknown) | null} constructEvent Stripe SDK webhook constructor.
 * @returns {import('../../payment-webhook-core.js').PaymentEvent} Verified event.
 */
export function parseStripePaymentWebhookEvent(request, env, constructEvent) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  const payload = extractRawPayload(request);
  if (!secret) throw new TypeError('Missing Stripe webhook secret');
  if (!payload) throw new TypeError('Missing Stripe webhook payload');
  const signature = extractHeader(request, 'stripe-signature');
  if (!signature) throw new TypeError('Missing Stripe signature');
  if (!constructEvent)
    throw new TypeError('Stripe webhook verifier unavailable');
  try {
    const verifiedEvent = constructEvent(payload, signature, secret);
    let verifiedPayload = JSON.stringify(verifiedEvent);
    if (typeof verifiedEvent === 'string') verifiedPayload = verifiedEvent;
    return parseJsonEvent(verifiedPayload);
  } catch {
    throw new TypeError('Invalid Stripe webhook signature');
  }
}

/**
 * Execute the domain handler and return its structured response.
 * @param {(request?: unknown) => Promise<{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }>} handler Domain webhook handler.
 * @param {unknown} req Incoming request.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }>} Structured response.
 */
async function handlePaymentWebhookRequest(handler, req) {
  return handler(req);
}

/**
 * Send the webhook response through the platform response object.
 * @param {{ status: (code: number) => { json: (payload: unknown) => unknown, send: (payload: unknown) => unknown, set?: (key: string, value: string) => unknown } }} res HTTP response.
 * @param {{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }} response Structured response.
 * @returns {Promise<void>} Resolves after the response is written.
 */
async function sendPaymentWebhookResponse(res, response) {
  const status = resolveWebhookStatus(response);
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value !== 'undefined') {
        /** @type {{ set?: (name: string, value: string) => void }} */ (
          res
        ).set?.(key, value);
      }
    }
  }

  if (response.body && typeof response.body === 'object') {
    res.status(status).json(response.body);
    return;
  }

  res.status(status).send(response.body);
}

/**
 * Normalize the HTTP status returned by the payment webhook.
 * @param {{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }} response Structured response.
 * @returns {number} HTTP status to write.
 */
function resolveWebhookStatus(response) {
  if (
    response.status === 200 &&
    response.body &&
    typeof response.body === 'object'
  ) {
    const body = /** @type {{ type?: unknown, applied?: unknown }} */ (
      response.body
    );
    if (body.type === 'credit_added' && body.applied === true) {
      return 201;
    }
  }

  return response.status;
}
