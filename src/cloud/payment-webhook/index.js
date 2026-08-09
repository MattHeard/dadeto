import Stripe from 'stripe';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createPaymentWebhookIndexHandler } from '../../core/cloud/payment-webhook/payment-webhook-core.js';

const stripe = new Stripe('webhook-verification-only');
const handle = createPaymentWebhookIndexHandler({
  firestore: Firestore,
  env: process.env,
  constructEvent: (payload, signature, secret) =>
    stripe.webhooks.constructEvent(payload, signature, secret),
});

export { handle };
