// @ts-nocheck -- payment and Firebase collaborators are injected structural test doubles.
import { calculatePackageCredits } from '../billing/pricing-core.js';

/** @typedef {any} CheckoutRuntimeValue Runtime-shaped Checkout value. */

/**
 * Build the dynamic package resolver used by the deployed Checkout function.
 * @param {{ getPackage: (packageId: string) => Promise<CheckoutRuntimeValue|null>, getCurrentPricingSnapshot: () => Promise<CheckoutRuntimeValue|null> }} billing Billing accessors.
 * @returns {(packageId: string) => Promise<CheckoutRuntimeValue|null>} Resolver.
 */
export function createDynamicPackageResolver({
  getPackage,
  getCurrentPricingSnapshot,
}) {
  return async packageId => {
    const packageData = await getPackage(packageId);
    if (
      !packageData?.active ||
      !Number.isSafeInteger(packageData.amountUsdMinor)
    )
      return null;
    const snapshot = await getCurrentPricingSnapshot();
    if (!snapshot) return null;
    const credits = calculatePackageCredits(
      packageData.amountUsdMinor,
      snapshot
    );
    if (credits <= 0) return null;
    return { ...packageData, pricingSnapshot: snapshot, credits };
  };
}

/**
 * Build cloud dependency adapters for Checkout.
 * @param {{ db: CheckoutRuntimeValue, billing: CheckoutRuntimeValue, stripe: CheckoutRuntimeValue, verifyIdToken: (token: string) => Promise<CheckoutRuntimeValue>, publicBillingOrigin?: string, stripeConfigured?: boolean }} input Runtime dependencies.
 * @returns {CheckoutRuntimeValue} Checkout dependencies.
 */
export function createCheckoutSessionDependencies({
  db,
  billing,
  stripe,
  verifyIdToken,
  publicBillingOrigin,
  stripeConfigured = true,
}) {
  return {
    verifyIdToken,
    resolveApiKeyUuidForUid: uid => resolveOwnedKey(db, uid),
    resolveBillingCustomer: uid => resolveBillingCustomer(db, uid),
    createBillingCustomer: options => stripe.customers.create(options),
    saveCustomerMappings: (uid, customerId, apiKeyUuid) =>
      saveCustomerMappings(db, uid, customerId, apiKeyUuid),
    getCreditPackage: createDynamicPackageResolver(billing),
    createPurchase: input => billing.createPurchase(input),
    savePurchaseCheckout: (purchaseId, session) =>
      billing.savePurchaseCheckout(purchaseId, session),
    resolveIdempotency: (uid, key, packageId) =>
      resolveIdempotency(billing, uid, key, packageId),
    createStripeCheckoutSession: (options, requestOptions) =>
      stripe.checkout.sessions.create(options, requestOptions),
    publicBillingOrigin,
    stripeConfigured,
  };
}

/**
 * @param {CheckoutRuntimeValue} db Firestore database.
 * @param {string} uid User identifier.
 * @returns {Promise<CheckoutRuntimeValue|null>} Key record.
 */
async function resolveOwnedKey(db, uid) {
  const snap = await db.collection('api-key-ownership').doc(uid).get();
  const apiKeyUuid = snap.data()?.apiKeyUuid;
  if (typeof apiKeyUuid !== 'string') return null;
  return { apiKeyUuid };
}

/**
 * @param {CheckoutRuntimeValue} db Firestore database.
 * @param {string} uid User identifier.
 * @returns {Promise<CheckoutRuntimeValue|null>} Customer record.
 */
async function resolveBillingCustomer(db, uid) {
  const snap = await db.collection('billing-customers').doc(uid).get();
  if (!snap.exists) return null;
  return snap.data();
}

/**
 * @param {CheckoutRuntimeValue} db Firestore database.
 * @param {string} uid User identifier.
 * @param {string} customerId Stripe customer identifier.
 * @param {string} apiKeyUuid API key UUID.
 * @returns {Promise<void>} Resolves after persistence.
 */
async function saveCustomerMappings(db, uid, customerId, apiKeyUuid) {
  await db.collection('billing-customers').doc(uid).set({
    uid,
    stripeCustomerId: customerId,
    apiKeyUuid,
  });
  await db.collection('payment-customers').doc(customerId).set({
    uid,
    apiKeyUuid,
  });
}

/**
 * @param {CheckoutRuntimeValue} billing Billing service.
 * @param {string} uid User identifier.
 * @param {string} key Idempotency key.
 * @param {string} packageId Package identifier.
 * @returns {Promise<CheckoutRuntimeValue|null>} Existing result.
 */
async function resolveIdempotency(billing, uid, key, packageId) {
  const purchase = await billing.getPurchase(`purchase-${uid}-${key}`);
  if (!purchase) return null;
  if (purchase.packageId !== packageId) return { conflict: true };
  if (!purchase.checkoutSessionId || !purchase.checkoutUrl) return null;
  return {
    session: {
      checkoutSessionId: purchase.checkoutSessionId,
      url: purchase.checkoutUrl,
      expiresAt: purchase.checkoutExpiresAt,
    },
  };
}
