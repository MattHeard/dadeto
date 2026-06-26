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
  verifyPaymentSignature,
} from '../../payment-webhook-core.js';

/** @typedef {typeof import('@google-cloud/firestore').Firestore} FirestoreCtor */
/** @typedef {Record<string, string | undefined>} ProcessEnvLike */

/**
 * Create the payment webhook request handler used by the cloud wrapper.
 * @param {{ firestore: FirestoreCtor, env?: ProcessEnvLike }} deps Dependencies for the wrapper.
 * @returns {(req: unknown, res: unknown) => Promise<unknown>} Request handler.
 */
export function createPaymentWebhookIndexHandler({
  firestore,
  env = process.env,
}) {
  const db = createDb(firestore);
  const handleRequest = createPaymentWebhookHandler({
    fetchCredit: createFetchCredit(/** @type {any} */ (db)),
    applyCreditEvent: createApplyCreditEvent(/** @type {any} */ (db)),
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
    getPaymentEvent: async request => parsePaymentWebhookEvent(request, env),
  });

  return async function handle(req, res) {
    const response = await handlePaymentWebhookRequest(handleRequest, req);
    return sendPaymentWebhookResponse(/** @type {any} */ (res), response);
  };
}

/**
 * Parse a payment webhook request body with optional signature validation.
 * @param {unknown} request Incoming request.
 * @param {ProcessEnvLike} [env] Environment values.
 * @returns {import('../../payment-webhook-core.js').PaymentEvent} Parsed event.
 */
export function parsePaymentWebhookEvent(request, env = process.env) {
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  const payload = extractRawPayload(request);
  if (!payload) throw new TypeError('Missing payment webhook payload');
  const signature = extractHeader(request, 'payment-signature');
  if (!secret) return parseJsonEvent(payload);
  if (!signature || !verifyPaymentSignature(payload, signature, secret))
    throw new TypeError('Invalid payment signature');
  return parseJsonEvent(payload);
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
        /** @type {any} */ (res).set?.(key, value);
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
