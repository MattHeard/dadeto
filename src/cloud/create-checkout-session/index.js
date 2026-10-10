import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createDb } from '../../core/cloud/get-api-key-credit-v2/create-db.js';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import { createCheckoutSessionDependencies } from '../../core/cloud/create-checkout-session/runtime-core.js';
import { createCheckoutSessionExpressHandle } from '../../core/cloud/create-checkout-session/create-checkout-session-core.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import {
  createCheckoutResponseAdapter,
  createCustomerMappingWriter,
} from './effect-adapters.js';
import { createCheckoutStripeAdapters } from './stripe-effects.js';

const db = createDb(Firestore, process.env);
const billing = createBillingRuntime(db, {
  billingEnabled: process.env.BILLING_ENABLED === 'true',
});
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
if (!stripe) {
  console.warn(
    'STRIPE_SECRET_KEY is not configured; checkout requests will be unavailable.'
  );
}
const dependencies = createCheckoutSessionDependencies({
  db,
  billing,
  verifyIdToken: token => getAuth().verifyIdToken(token),
  ...createCheckoutStripeAdapters(stripe),
  saveCustomerMappings: createCustomerMappingWriter(db),
  publicBillingOrigin: process.env.PUBLIC_BILLING_ORIGIN,
  stripeConfigured: Boolean(stripe),
  billingEnabled: process.env.BILLING_ENABLED === 'true',
});
const checkoutHandle = createCheckoutSessionExpressHandle(dependencies);
const handle = createEffectHttpBoundary(
  async (allowEffects, request, response) => {
    await checkoutHandle(
      allowEffects,
      request,
      createCheckoutResponseAdapter(response)
    );
  }
);

export { handle };
