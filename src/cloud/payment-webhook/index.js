import Stripe from 'stripe';
import { createBillingPurchaseId } from '../billing/runtime-adapter.js';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createPaymentWebhookIndexHandler } from '../../core/cloud/payment-webhook/payment-webhook-core.js';
import {
  createEffectHttpBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import { createPaymentWebhookStartupDb } from './startup-effect-adapter.js';
import {
  createMarkProcessedEventWriter,
} from './effect-adapters.js';
import { createDeferredPaymentEventReader } from './deferred-event-adapter.js';
import { createRefundReconciliationWriter } from './refund-reconciliation-effect-adapter.js';
import { createBillingTransactionRunner } from '../billing/transaction-effect-adapter.js';
import {
  sendPaymentWebhookResponse,
  logPaymentWebhookError,
} from './response-effect-adapters.js';
import { createGetApiKeyCreditV2EffectAdapters } from '../get-api-key-credit-v2/effect-adapters.js';

const stripe = new Stripe('webhook-verification-only');
const db = createEffectStartupBoundary(allowEffects =>
  createPaymentWebhookStartupDb(allowEffects, Firestore, process.env)
);
const handlePaymentWebhook = createPaymentWebhookIndexHandler({
  db,
  randomUUID: createBillingPurchaseId,
  env: process.env,
  constructEvent: (payload, signature, secret) =>
    stripe.webhooks.constructEvent(payload, signature, secret),
  creditEventEffects: createGetApiKeyCreditV2EffectAdapters(db),
  readDeferredPaymentEvents: createDeferredPaymentEventReader(db),
  markProcessedEvent: createMarkProcessedEventWriter(db),
  writeRefundReconciliation: createRefundReconciliationWriter(db),
  runBillingTransaction: createBillingTransactionRunner(db),
  sendResponse: sendPaymentWebhookResponse,
  logError: logPaymentWebhookError,
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handlePaymentWebhook(allowEffects, req, res)
);

export { handle };
