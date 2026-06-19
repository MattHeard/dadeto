import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  createPaymentWebhookHandler,
  createResolveApiKeyUuid,
} from '../../core/payment-webhook-core.js';
import { createApplyCreditEvent, createFetchCredit } from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import { createDb } from '../get-api-key-credit-v2/create-db.js';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';

const db = createDb(Firestore);

const fetchCredit = createFetchCredit(db);
const applyCreditEvent = createApplyCreditEvent(db);
const resolveApiKeyUuid = createResolveApiKeyUuid({
  findApiKeyUuidByCustomerId: async customerId => {
    const snap = await db.collection('payment-customers').doc(customerId).get();
    const apiKeyUuid = snap.data()?.apiKeyUuid;
    return typeof apiKeyUuid === 'string' && apiKeyUuid ? apiKeyUuid : null;
  },
});

const handleRequest = createPaymentWebhookHandler({
  fetchCredit,
  applyCreditEvent,
  resolveApiKeyUuid,
  isDuplicateEvent: async eventId => {
    const snap = await db.collection('payment-events').doc(eventId).get();
    return snap.exists;
  },
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
  try {
    const { status, body } = await handleRequest(req);
    if (typeof body === 'string') {
      return res.status(status).send(body);
    }

    return res.status(status).json(body);
  } catch (error) {
    return res.status(400).send(error instanceof Error ? error.message : String(error));
  }
}

export function parsePaymentWebhookEvent(request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const payload = extractRawPayload(request);
  if (!payload) {
    throw new TypeError('Missing payment webhook payload');
  }

  const signature = extractHeader(request, 'payment-signature');
  if (!secret) {
    return parseJsonEvent(payload);
  }

  if (!signature || !verifyPaymentSignature(payload, signature, secret)) {
    throw new TypeError('Invalid payment signature');
  }

  return parseJsonEvent(payload);
}

export function parseJsonEvent(payload) {
  const parsed = JSON.parse(payload);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') {
    throw new TypeError('Invalid payment event payload');
  }

  return parsed;
}

export function extractRawPayload(request) {
  if (typeof request?.rawBody === 'string') {
    return request.rawBody;
  }

  if (Buffer.isBuffer(request?.rawBody)) {
    return request.rawBody.toString('utf8');
  }

  if (typeof request?.body === 'string') {
    return request.body;
  }

  if (request?.body && typeof request.body === 'object') {
    return JSON.stringify(request.body);
  }

  return '';
}

export function extractHeader(request, name) {
  const headers = request?.headers ?? {};
  const lower = name.toLowerCase();
  const value = headers[name] ?? headers[lower];
  return typeof value === 'string' ? value : '';
}

export function verifyPaymentSignature(payload, signature, secret) {
  const parts = Object.fromEntries(
    signature.split(',').map(part => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const actual = createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return safeEqual(actual, expected);
}

export function safeEqual(actual, expected) {
  const left = Buffer.from(actual, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
