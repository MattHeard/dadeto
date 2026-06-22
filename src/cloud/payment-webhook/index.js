import { createApplyCreditEvent, createFetchCredit } from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import { createDb } from '../get-api-key-credit-v2/create-db.js';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createPaymentWebhookHandler, createResolveApiKeyUuid, extractHeader, extractRawPayload, parseJsonEvent, verifyPaymentSignature } from '../../core/payment-webhook-core.js';

const db = createDb(Firestore);
const handleRequest = createPaymentWebhookHandler({
  fetchCredit: createFetchCredit(db),
  applyCreditEvent: createApplyCreditEvent(db),
  resolveApiKeyUuid: createResolveApiKeyUuid({
    findApiKeyUuidByCustomerId: async customerId => {
      const snap = await db.collection('payment-customers').doc(customerId).get();
      const apiKeyUuid = snap.data()?.apiKeyUuid;
      return typeof apiKeyUuid === 'string' && apiKeyUuid ? apiKeyUuid : null;
    },
  }),
  isDuplicateEvent: async eventId => (await db.collection('payment-events').doc(eventId).get()).exists,
  markProcessedEvent: async (event, uuid) => {
    await db.collection('payment-events').doc(event.id).set({
      apiKeyUuid: uuid,
      type: event.type,
      createdAt: new Date(event.created ? event.created * 1000 : Date.now()),
    });
  },
  getPaymentEvent: async request => parsePaymentWebhookEvent(request),
});

export async function handle(req, res) {
  const response = await handlePaymentWebhookRequest(handleRequest, req);
  return sendPaymentWebhookResponse(res, response);
}

export { createResolveApiKeyUuid, extractHeader, extractRawPayload, parseJsonEvent, verifyPaymentSignature } from '../../core/payment-webhook-core.js';

export function parsePaymentWebhookEvent(request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const payload = extractRawPayload(request);
  if (!payload) throw new TypeError('Missing payment webhook payload');
  const signature = extractHeader(request, 'payment-signature');
  if (!secret) return parseJsonEvent(payload);
  if (!signature || !verifyPaymentSignature(payload, signature, secret)) throw new TypeError('Invalid payment signature');
  return parseJsonEvent(payload);
}

/**
 * Execute the domain handler and return its structured HTTP response.
 * @param {(request?: unknown) => Promise<{ status: number, body: string | Record<string, unknown>, headers?: Record<string, string> }>} handleRequest Domain webhook handler.
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
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value !== 'undefined') {
        res.set?.(key, value);
      }
    }
  }

  if (response.body && typeof response.body === 'object') {
    res.status(response.status).json(response.body);
    return;
  }

  res.status(response.status).send(response.body);
}
