import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import { createPublicBillingOffersHandler } from '../../core/cloud/billing/public-offers-core.js';
import { sendPublicBillingOffersResponse } from './effect-adapters.js';
import { createPublicBillingOffersHttpHandler } from './http-handler.js';

const db = new Firestore({ databaseId: process.env.DATABASE_ID });
const billing = createBillingRuntime(db);
const billingEnabled = process.env.BILLING_ENABLED === 'true';
const handleOffers = createPublicBillingOffersHandler({
  listActivePackages: async () => {
    const snapshot = await db.collection('billing-packages').where('active', '==', true).get();
    return snapshot.docs.map(doc => ({ packageId: doc.id, ...doc.data() }));
  },
  getCurrentPricingSnapshot: billing.getCurrentPricingSnapshot,
  billingEnabled,
});

export const handle = createPublicBillingOffersHttpHandler(
  handleOffers,
  sendPublicBillingOffersResponse
);
