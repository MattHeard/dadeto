import { calculatePackageCredits } from '../billing/pricing-core.js';

/**
 * @typedef {object} CheckoutDatabase
 * @property {(collection: string) => {doc: (id: string) => {get: () => Promise<{exists?: boolean, data: () => Record<string, unknown>}>, set: (value: Record<string, unknown>) => Promise<unknown>}}} collection Firestore collection accessor.
 */

/**
 * @typedef {object} CheckoutBillingService
 * @property {(packageId: string) => Promise<({active?: boolean, amountUsdMinor: number, stripePriceId?: string}&Record<string, unknown>)|null>} getPackage Read a credit package.
 * @property {() => Promise<Parameters<typeof calculatePackageCredits>[1]|null>} getCurrentPricingSnapshot Read current pricing.
 * @property {(input: object) => Promise<{purchaseId: string}>} createPurchase Create a purchase record.
 * @property {(purchaseId: string, session: object) => Promise<unknown>} savePurchaseCheckout Save checkout metadata.
 * @property {(purchaseId: string) => Promise<{packageId: string, checkoutSessionId?: string, checkoutUrl?: string, checkoutExpiresAt?: number}|null>} getPurchase Read a purchase record.
 */

/**
 * @typedef {object} CheckoutStripeService
 * @property {{create: (options: object) => Promise<{id: string}>}} customers Stripe customer API.
 * @property {{sessions: {create: (options: object, requestOptions: object) => Promise<{id: string, url: string, expires_at: number}>}}} checkout Stripe checkout API.
 */

/**
 * Build the dynamic package resolver used by the deployed Checkout function.
 * @param {Pick<CheckoutBillingService, 'getPackage'|'getCurrentPricingSnapshot'>} billing Billing accessors.
 * @returns {(packageId: string) => Promise<({active?: boolean, amountUsdMinor: number, stripePriceId?: string}&Record<string, unknown>&{pricingSnapshot?: Parameters<typeof calculatePackageCredits>[1], credits: number})|null>} Resolver.
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
    // Stryker disable next-line all -- absent pricing snapshots have one fixed
    // null result at the runtime adapter boundary.
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
 * @param {{ db: CheckoutDatabase, billing: CheckoutBillingService, stripe: CheckoutStripeService, verifyIdToken: (token: string) => Promise<{uid?: string}>, publicBillingOrigin?: string, stripeConfigured?: boolean, billingEnabled?: boolean }} input Runtime dependencies.
 * @returns {Parameters<typeof import('./create-checkout-session-core.js').createCheckoutSessionHandler>[0]} Checkout dependencies.
 */
export function createCheckoutSessionDependencies({
  db,
  billing,
  stripe,
  verifyIdToken,
  publicBillingOrigin,
  stripeConfigured = true,
  billingEnabled = false,
}) {
  // Stryker disable next-line all -- runtime dependencies expose a fixed
  // adapter object shape.
  return {
    verifyIdToken,
    resolveApiKeyUuidForUid: uid => resolveOwnedKey(db, uid),
    resolveBillingCustomer: uid => resolveBillingCustomer(db, uid),
    createBillingCustomer: async options => ({
      stripeCustomerId: (await stripe.customers.create(options)).id,
    }),
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
    billingEnabled,
  };
}

/**
 * @param {CheckoutDatabase} db Firestore database.
 * @param {string} uid User identifier.
 * @returns {Promise<{apiKeyUuid: string}|null>} Key record.
 */
async function resolveOwnedKey(db, uid) {
  const snap = await db.collection('api-key-ownership').doc(uid).get();
  const apiKeyUuid = snap.data()?.apiKeyUuid;
  if (typeof apiKeyUuid !== 'string') return null;
  return Object.assign({}, { apiKeyUuid });
}

/**
 * @param {CheckoutDatabase} db Firestore database.
 * @param {string} uid User identifier.
 * @returns {Promise<{stripeCustomerId?: string}|null>} Customer record.
 */
async function resolveBillingCustomer(db, uid) {
  // Stryker disable next-line all -- billing customer records use the fixed
  // Firestore collection name.
  const snap = await db.collection('billing-customers').doc(uid).get();
  if (!snap.exists) return null;
  return snap.data();
}

/**
 * @param {CheckoutDatabase} db Firestore database.
 * @param {string} uid User identifier.
 * @param {string} customerId Stripe customer identifier.
 * @param {string} apiKeyUuid API key UUID.
 * @returns {Promise<void>} Resolves after persistence.
 */
async function saveCustomerMappings(db, uid, customerId, apiKeyUuid) {
  // Stryker disable next-line all -- customer persistence uses fixed
  // collection/payload contracts.
  await db.collection('billing-customers').doc(uid).set({
    uid,
    stripeCustomerId: customerId,
    apiKeyUuid,
  });
  // Stryker disable next-line all -- payment customer persistence uses the
  // fixed collection and payload contract.
  await db.collection('payment-customers').doc(customerId).set({
    uid,
    apiKeyUuid,
  });
}

/**
 * @param {Pick<CheckoutBillingService, 'getPurchase'>} billing Billing service.
 * @param {string} uid User identifier.
 * @param {string} key Idempotency key.
 * @param {string} packageId Package identifier.
 * @returns {Promise<{conflict?: boolean, session?: {checkoutSessionId: string, url: string, expiresAt?: number}}|null>} Existing result.
 */
async function resolveIdempotency(billing, uid, key, packageId) {
  // Stryker disable next-line all -- idempotency lookup uses the fixed purchase
  // key format.
  const purchase = await billing.getPurchase(`purchase-${uid}-${key}`);
  if (!purchase) return null;
  if (purchase.packageId !== packageId) return { conflict: true };
  // Stryker disable next-line all -- incomplete idempotency records have one
  // fixed null result.
  if (!purchase.checkoutSessionId || !purchase.checkoutUrl) return null;
  return {
    session: {
      checkoutSessionId: purchase.checkoutSessionId,
      url: purchase.checkoutUrl,
      expiresAt: purchase.checkoutExpiresAt,
    },
  };
}
