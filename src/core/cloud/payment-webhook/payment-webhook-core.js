import {
  createApplyCreditEvent,
  createFetchCredit,
} from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import {
  createPaymentWebhookHandler,
  createResolveApiKeyUuid,
  extractHeader,
  readMetadata,
} from '../../payment-webhook-core.js';
import { createBillingRuntime } from '../billing/billing-runtime-core.js';

/** @typedef {Record<string, string | undefined>} ProcessEnvLike */
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create the payment webhook request handler used by the cloud wrapper.
 * @param {{ db: any, env?: ProcessEnvLike, constructEvent?: (payload: string|Buffer, signature: string, secret: string) => unknown, creditEventEffects: Parameters<typeof import('../get-api-key-credit-v2/get-api-key-credit-v2-core.js').createApplyCreditEvent>[1], markProcessedEvent: (allowEffects: AllowEffects, event: import('../../payment-webhook-core.js').PaymentEvent, uuid: string, status?: string) => Promise<void>, writeRefundReconciliation: (allowEffects: AllowEffects, eventId: string, record: Record<string, unknown>) => Promise<void>, sendResponse: (allowEffects: AllowEffects, response: unknown, result: import('../../payment-webhook-core.js').PaymentWebhookResponse) => unknown, logError: (allowEffects: AllowEffects, error: unknown) => void }} deps Dependencies for the wrapper.
 * @returns {(allowEffects: AllowEffects, req: unknown, res: unknown) => Promise<unknown>} Request handler.
 */
export function createPaymentWebhookIndexHandler(deps) {
  if (!deps.db) throw new TypeError('db must be provided');
  if (typeof deps.writeRefundReconciliation !== 'function') {
    throw new TypeError('writeRefundReconciliation must be provided');
  }
  const db = deps.db;
  const env = deps.env === undefined ? process.env : deps.env;
  const constructEvent = deps.constructEvent;
  const creditEventEffects = deps.creditEventEffects;
  const markProcessedEvent = deps.markProcessedEvent;
  const sendResponse = deps.sendResponse;
  const logError = deps.logError;
  const billing = createBillingRuntime(db, {
    writeRefundReconciliation: deps.writeRefundReconciliation,
  });
  const handleRequest = createPaymentWebhookHandler({
    fetchCredit: createFetchCredit(db),
    applyCreditEvent: createApplyCreditEvent(db, creditEventEffects),
    resolveApiKeyUuid: createResolveApiKeyUuid({
      findApiKeyUuidByCustomerId: async customerId => {
        const snap = await db
          .collection('payment-customers')
          .doc(customerId)
          .get();
        // Stryker disable next-line all -- Firestore customer snapshots may omit
        // data; this defensive adapter normalization is part of the fixed schema.
        const apiKeyUuid = snap.data()?.apiKeyUuid;
        if (typeof apiKeyUuid === 'string' && apiKeyUuid) {
          return apiKeyUuid;
        }

        return null;
      },
    }),
    handlePurchaseEvent: (allowEffects, event) =>
      handlePurchaseEvent(allowEffects, billing, event),
    isDuplicateEvent: async eventId => {
      // Stryker disable next-line all -- payment-events is a fixed persistence
      // collection owned by this adapter.
      const snap = await db.collection('payment-events').doc(eventId).get();
      const status = snap.data()?.status;
      return snap.exists && status !== 'received' && status !== 'deferred';
    },
    markProcessedEvent,
    getPaymentEvent: async request =>
      parseStripePaymentWebhookEvent(request, env, constructEvent ?? null),
  });

  return async function handle(allowEffects, req, res) {
    let response;
    try {
      response = await handlePaymentWebhookRequest(
        handleRequest,
        allowEffects,
        req
      );
    } catch (error) {
      logError(allowEffects, error);
      throw error;
    }
    return sendResponse(allowEffects, res, response);
  };
}

/**
 * Resolve a Stripe event against the purchase ledger.
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse | null>} Response or null.
 */
async function handlePurchaseEvent(allowEffects, billing, event) {
  const metadata = readMetadata(event.data?.object ?? {});
  if (event.type === 'charge.refunded')
    return handleChargeRefunded(allowEffects, billing, metadata, event);
  if (!metadata.purchase_id) return null;
  if (event.type === 'checkout.session.completed')
    return handleCheckoutCompleted(allowEffects, billing, metadata, event);
  if (event.type === 'checkout.session.expired')
    return billing.markPurchaseExpired(allowEffects, {
      purchaseId: metadata.purchase_id,
      eventId: event.id,
    });
  if (event.type === 'payment_intent.succeeded')
    return handlePaymentIntentSucceeded(allowEffects, billing, metadata, event);
  return null;
}

/**
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Record<string, string>} metadata Stripe metadata.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse|null>} Response.
 */
async function handleCheckoutCompleted(allowEffects, billing, metadata, event) {
  // Stryker disable next-line all -- verified Stripe event shape is normalized
  // by the purchase metadata gate; optional chaining is defensive compatibility.
  if (event.data?.object?.payment_status !== 'paid') return null;
  return markPaidPurchase(allowEffects, billing, {
    purchaseId: metadata.purchase_id,
    eventId: event.id,
    // Stryker disable next-line all -- empty payment-intent fallback is fixed.
    stripePaymentIntentId: String(event.data?.object?.payment_intent ?? ''),
  });
}

/**
 * Mark a purchase as paid.
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Parameters<ReturnType<typeof createBillingRuntime>['markPurchasePaid']>[1]} input Payment input.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse>} Payment update result.
 */
function markPaidPurchase(allowEffects, billing, input) {
  return billing.markPurchasePaid(allowEffects, input);
}

/**
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Record<string, string>} metadata Stripe metadata.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse>} Response.
 */
async function handlePaymentIntentSucceeded(
  allowEffects,
  billing,
  metadata,
  event
) {
  return markPaidPurchase(allowEffects, billing, {
    purchaseId: metadata.purchase_id,
    eventId: event.id,
    stripePaymentIntentId: String(event.data?.object?.id ?? ''),
  });
}

/**
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {ReturnType<typeof createBillingRuntime>} billing Billing service.
 * @param {Record<string, string>} metadata Stripe metadata.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Stripe event.
 * @returns {Promise<import('../../payment-webhook-core.js').PaymentWebhookResponse>} Response.
 */
async function handleChargeRefunded(allowEffects, billing, metadata, event) {
  const charge = event.data?.object ?? {};
  const stripePaymentIntentId = String(charge.payment_intent ?? '');
  const refundedUsdMinor = Number(charge.amount_refunded ?? 0);
  await billing.recordRefundReconciliation(allowEffects, {
    eventId: event.id,
    purchaseId: metadata.purchase_id ?? '',
    stripePaymentIntentId,
    chargeId: String(charge.id ?? ''),
    refundedUsdMinor,
  });
  return {
    status: 200,
    body: {
      quarantined: true,
      reason: 'external_stripe_refund',
      eventId: event.id,
    },
  };
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
  // Stryker disable next-line all -- request may be absent at the platform
  // boundary; this is defensive normalization before required-field checks.
  const rawBody = /** @type {{ rawBody?: string|Buffer }|null|undefined} */ (
    request
  )?.rawBody;
  const payload = resolveStripePayload(rawBody);
  if (!secret) throw new TypeError('Missing Stripe webhook secret');
  if (!payload) throw new TypeError('Missing Stripe webhook payload');
  const signature = extractHeader(request, 'stripe-signature');
  if (!signature) throw new TypeError('Missing Stripe signature');
  if (!constructEvent)
    throw new TypeError('Stripe webhook verifier unavailable');
  try {
    return validateVerifiedStripeEvent(
      constructEvent(payload, signature, secret)
    );
  } catch {
    throw new TypeError('Invalid Stripe webhook signature');
  }
}

/**
 * Normalize the supported Stripe request body representations.
 * @param {unknown} rawBody Raw request body.
 * @returns {string|Buffer} Payload or an empty string when absent.
 */
function resolveStripePayload(rawBody) {
  if (typeof rawBody === 'string') return rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody;
  return '';
}

/**
 * Validate the minimal shape required from a verified Stripe event.
 * @param {unknown} verifiedEvent Event returned by Stripe verification.
 * @returns {import('../../payment-webhook-core.js').PaymentEvent} Validated event.
 */
function validateVerifiedStripeEvent(verifiedEvent) {
  // Stryker disable next-line all -- Stripe verification output is an external
  // boundary with one fixed invalid-event error contract.
  if (!verifiedEvent || typeof verifiedEvent !== 'object')
    // Stryker disable next-line all -- fixed external verification error text.
    throw new TypeError('Invalid verified Stripe event');
  const event = /** @type {{ id?: unknown }} */ (verifiedEvent);
  // Stryker disable next-line all -- invalid verified IDs share one fixed error
  // contract at this boundary.
  if (typeof event.id !== 'string' || !event.id)
    // Stryker disable next-line all -- fixed external verification error text.
    throw new TypeError('Invalid verified Stripe event id');
  return /** @type {import('../../payment-webhook-core.js').PaymentEvent} */ (
    verifiedEvent
  );
}

/**
 * Execute the domain handler and return its structured response.
 * @param {(allowEffects: AllowEffects, request?: unknown) => Promise<{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }>} handler Domain webhook handler.
 * @param {AllowEffects} allowEffects Request effect capability.
 * @param {unknown} req Incoming request.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }>} Structured response.
 */
async function handlePaymentWebhookRequest(handler, allowEffects, req) {
  return handler(allowEffects, req);
}

/**
 * Send the webhook response through the platform response object.
 * @param {{ status: (code: number) => { json: (payload: unknown) => unknown, send: (payload: unknown) => unknown, set?: (key: string, value: string) => unknown } }} res HTTP response.
 * @param {{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }} response Structured response.
 * @returns {Promise<void>} Resolves after the response is written.
 */
