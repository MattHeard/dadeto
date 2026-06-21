import { createApplyCreditEvent, createFetchCredit } from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import { createDb } from '../get-api-key-credit-v2/create-db.js';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createPaymentWebhookHandler, createResolveApiKeyUuid, extractHeader, extractRawPayload, parseJsonEvent, verifyPaymentSignature } from '../../core/payment-webhook-core.js';

const db = createDb(Firestore);
const handle = createPaymentWebhookHandler({
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

export { handle };
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
