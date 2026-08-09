import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import { createPurchaseStatusHandler } from '../../core/cloud/billing/purchase-status-core.js';

const db = new Firestore({ databaseId: process.env.DATABASE_ID });
const billing = createBillingRuntime(db);
const handleStatus = createPurchaseStatusHandler({
  verifyIdToken: token => getAuth().verifyIdToken(token),
  getPurchaseByCheckoutSession: billing.getPurchaseByCheckoutSession,
  getBalance: async uuid => (await db.collection('api-key-credits').doc(uuid).get()).data()?.credit ?? 0,
});

export async function handle(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const response = await handleStatus({
    sessionId: req.query?.session_id,
    authorization: req.get?.('authorization') ?? req.headers?.authorization,
  });
  return res.status(response.status).json(response.body);
}
