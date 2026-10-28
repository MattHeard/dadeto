import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createBillingRuntime } from '../billing/runtime-adapter.js';
import { createPurchaseStatusHandler } from '../../core/cloud/billing/purchase-status-core.js';
import { sendPurchaseStatusResponse } from './effect-adapters.js';
import { createPurchaseStatusHttpHandler } from './http-handler.js';
import { createBillingTransactionRunner } from '../billing/transaction-effect-adapter.js';

const db = new Firestore({ databaseId: process.env.DATABASE_ID });
const billing = createBillingRuntime(db, {
  runBillingTransaction: createBillingTransactionRunner(db),
});
const handleStatus = createPurchaseStatusHandler({
  verifyIdToken: token => getAuth().verifyIdToken(token),
  getPurchaseByCheckoutSession: billing.getPurchaseByCheckoutSession,
  getBalance: async uuid => (await db.collection('api-key-credits').doc(uuid).get()).data()?.credit ?? 0,
});

export const handle = createPurchaseStatusHttpHandler(
  handleStatus,
  sendPurchaseStatusResponse
);
