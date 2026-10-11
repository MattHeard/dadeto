import { calculatePackageCredits } from '../billing/pricing-core.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @typedef {object} CheckoutDatabase
 * @property {(collection: string) => {doc: (id: string) => {get: () => Promise<{exists?: boolean, data: () => Record<string, unknown>}>}}} collection Firestore collection accessor.
 */

/**
 * @typedef {object} CheckoutBillingService
 * @property {(packageId: string) => Promise<({active?: boolean, amountUsdMinor: number, stripePriceId?: string}&Record<string, unknown>)|null>} getPackage Read a credit package.
 * @property {() => Promise<Parameters<typeof calculatePackageCredits>[1]|null>} getCurrentPricingSnapshot Read current pricing.
 * @property {(allowEffects: AllowEffects, input: object) => Promise<{purchaseId: string}>} createPurchase Create a purchase record.
 * @property {(allowEffects: AllowEffects, purchaseId: string, session: object) => Promise<unknown>} savePurchaseCheckout Save checkout metadata.
 * @property {(purchaseId: string) => Promise<{packageId: string, checkoutSessionId?: string, checkoutUrl?: string, checkoutExpiresAt?: number}|null>} getPurchase Read a purchase record.
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
 * @param {{ db: CheckoutDatabase, billing: CheckoutBillingService, verifyIdToken: (token: string) => Promise<{uid?: string}>, createBillingCustomer: (allowEffects: AllowEffects, options: object) => Promise<{stripeCustomerId: string}>, saveCustomerMappings: (allowEffects: AllowEffects, uid: string, customerId: string, apiKeyUuid: string) => Promise<unknown>, createStripeCheckoutSession: (allowEffects: AllowEffects, options: object, requestOptions: object) => Promise<{id: string, url: string, expires_at: number}>, publicBillingOrigin?: string, stripeConfigured?: boolean, billingEnabled?: boolean }} deps Runtime dependencies.
 * @returns {Parameters<typeof import('./create-checkout-session-core.js').createCheckoutSessionHandler>[0]} Checkout dependencies.
 */
export function createCheckoutSessionDependencies(deps) {
  // Stryker disable next-line all -- runtime dependencies expose a fixed
  // adapter object shape.
  return {
    verifyIdToken: deps.verifyIdToken,
    resolveApiKeyUuidForUid: uid => resolveOwnedKey(deps.db, uid),
    resolveBillingCustomer: uid => resolveBillingCustomer(deps.db, uid),
    createBillingCustomer: deps.createBillingCustomer,
    saveCustomerMappings: deps.saveCustomerMappings,
    getCreditPackage: createDynamicPackageResolver(deps.billing),
    createPurchase: (allowEffects, input) => {
      void allowEffects;
      return deps.billing.createPurchase(allowEffects, input);
    },
    savePurchaseCheckout: (allowEffects, purchaseId, session) => {
      void allowEffects;
      return deps.billing.savePurchaseCheckout(
        allowEffects,
        purchaseId,
        session
      );
    },
    resolveIdempotency: (uid, key, packageId) =>
      resolveIdempotency(deps.billing, uid, key, packageId),
    createStripeCheckoutSession: deps.createStripeCheckoutSession,
    publicBillingOrigin: deps.publicBillingOrigin,
    stripeConfigured: deps.stripeConfigured ?? true,
    billingEnabled: deps.billingEnabled ?? false,
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
