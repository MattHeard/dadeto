import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createDb } from '../../core/cloud/get-api-key-credit-v2/create-db.js';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import { createCheckoutSessionDependencies } from '../../core/cloud/create-checkout-session/runtime-core.js';
import { createCheckoutSessionExpressHandle } from '../../core/cloud/create-checkout-session/create-checkout-session-core.js';

const db = createDb(Firestore, process.env);
const billing = createBillingRuntime(db);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const dependencies = createCheckoutSessionDependencies({
  db,
  billing,
  stripe,
  verifyIdToken: token => getAuth().verifyIdToken(token),
  publicBillingOrigin: process.env.PUBLIC_BILLING_ORIGIN,
});
const handle = createCheckoutSessionExpressHandle(dependencies);

export { handle };
