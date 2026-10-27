import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import { createBillingRefundRequestHandler } from '../../core/cloud/billing/refund-request-core.js';
import { createBillingTransactionRunner } from './transaction-effect-adapter.js';
import { createPublicBillingOffersHandler } from '../../core/cloud/billing/public-offers-core.js';
import { sendPublicBillingOffersResponse } from './effect-adapters.js';
import { createBillingHttpHandler } from './http-handler.js';
import { createStripeRefundAdapter } from './refund-stripe-adapter.js';
import { sha256Utf8 } from './refund-identity-adapter.js';

const db = new Firestore({ databaseId: process.env.DATABASE_ID });
const billingEnabled = process.env.BILLING_ENABLED === 'true';
const billing = createBillingRuntime(db, {
  billingEnabled,
  runBillingTransaction: createBillingTransactionRunner(db),
});
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const handleOffers = createPublicBillingOffersHandler({
  listActivePackages: async () => {
    const snapshot = await db.collection('billing-packages').where('active', '==', true).get();
    return snapshot.docs.map(doc => ({ packageId: doc.id, ...doc.data() }));
  },
  getCurrentPricingSnapshot: billing.getCurrentPricingSnapshot,
  billingEnabled,
});
const handleRefund = createBillingRefundRequestHandler({
  sha256Utf8,
  billingEnabled,
  stripeConfigured: Boolean(stripe),
  verifyIdToken: token => getAuth().verifyIdToken(token),
  getPurchase: billing.getPurchase,
  createRefundIntent: billing.createRefundIntent,
  createStripeRefund: createStripeRefundAdapter(stripe),
  recordRefundSubmission: billing.recordRefundSubmission,
  markRefundIntentAmbiguous: billing.markRefundIntentAmbiguous,
});

export const handle = createBillingHttpHandler(
  handleOffers,
  sendPublicBillingOffersResponse,
  handleRefund
);
