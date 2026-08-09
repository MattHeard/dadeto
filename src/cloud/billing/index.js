import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import { createPublicBillingOffersHandler } from '../../core/cloud/billing/public-offers-core.js';

const db = new Firestore({ databaseId: process.env.DATABASE_ID });
const billing = createBillingRuntime(db);
const handleOffers = createPublicBillingOffersHandler({
  listActivePackages: async () => {
    const snapshot = await db.collection('billing-packages').where('active', '==', true).get();
    return snapshot.docs.map(doc => ({ packageId: doc.id, ...doc.data() }));
  },
  getCurrentPricingSnapshot: billing.getCurrentPricingSnapshot,
});

export async function handle(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const response = await handleOffers();
  return res.status(response.status).json(response.body);
}
