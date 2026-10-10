import Stripe from 'stripe';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createDb } from '../../core/cloud/get-api-key-credit-v2/create-db.js';
import { createPaymentWebhookIndexHandler } from '../../core/cloud/payment-webhook/payment-webhook-core.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createMarkProcessedEventWriter } from './effect-adapters.js';
import { createGetApiKeyCreditV2EffectAdapters } from '../get-api-key-credit-v2/effect-adapters.js';

const stripe = new Stripe('webhook-verification-only');
const db = createDb(Firestore, process.env);
const handlePaymentWebhook = createPaymentWebhookIndexHandler({
  firestore: Firestore,
  db,
  env: process.env,
  constructEvent: (payload, signature, secret) =>
    stripe.webhooks.constructEvent(payload, signature, secret),
  creditEventEffects: createGetApiKeyCreditV2EffectAdapters(db),
  markProcessedEvent: createMarkProcessedEventWriter(db),
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handlePaymentWebhook(allowEffects, req, res)
);

export { handle };
