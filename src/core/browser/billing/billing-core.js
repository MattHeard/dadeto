import { isObjectRecord } from '../validation.js';

/** @typedef {{packageId: string, currency: 'usd', amountUsdMinor: number, credits: number}} BillingOffer */

/**
 * Normalize the public server-priced package response.
 * @param {unknown} value Server response.
 * @returns {Array<{ packageId: string, currency: string, amountUsdMinor: number, credits: number }>} Offers.
 */
export function normalizeBillingOffers(value) {
  if (!isObjectRecord(value) || !Array.isArray(value.packages))
    throw new TypeError('Invalid billing package response');
  return value.packages.map(normalizeBillingOffer);
}

/**
 * Normalize one display-ready offer.
 * @param {unknown} offer Candidate offer.
 * @returns {{ packageId: string, currency: string, amountUsdMinor: number, credits: number }} Normalized offer.
 */
function normalizeBillingOffer(offer) {
  assertBillingOfferObject(offer);
  const { packageId, currency, amountUsdMinor, credits } = offer;
  if (typeof packageId !== 'string')
    throw new TypeError('Invalid billing package');
  if (currency !== 'usd') throw new TypeError('Invalid billing package');
  if (
    typeof amountUsdMinor !== 'number' ||
    !Number.isSafeInteger(amountUsdMinor)
  )
    throw new TypeError('Invalid billing package');
  if (amountUsdMinor <= 0) throw new TypeError('Invalid billing package');
  if (typeof credits !== 'number' || !Number.isSafeInteger(credits))
    throw new TypeError('Invalid billing package');
  if (credits <= 0) throw new TypeError('Invalid billing package');
  return { packageId, currency, amountUsdMinor, credits };
}

/**
 * Ensure an offer has an object shape before field validation.
 * @param {unknown} offer Candidate offer.
 * @returns {asserts offer is Record<string, unknown>} Throws for non-record values.
 */
function assertBillingOfferObject(offer) {
  if (!isObjectRecord(offer)) throw new TypeError('Invalid billing package');
}

/**
 * Create the deterministic billing purchase controller.
 * @param {{ loadOffers: () => Promise<unknown>, getFreshToken: () => Promise<string|null>, signIn: () => Promise<void>, createUuid: () => string, bindEffectBoundary: (handler: (permission: import('../../../../types/allow-effects').AllowEffects) => Promise<unknown>) => Promise<unknown>, postCheckout: (permission: import('../../../../types/allow-effects').AllowEffects, packageId: string, token: string, attemptId: string) => Promise<unknown>, navigate: (permission: import('../../../../types/allow-effects').AllowEffects, url: string) => void }} deps Browser boundaries.
 * @returns {{ loadOffers: () => Promise<unknown>, startPurchase: (packageId: string) => Promise<unknown>, retry: () => Promise<unknown>, getAttemptId: () => string|null }} Controller.
 */
export function createBillingController(deps) {
  /** @type {string|null} */
  let selectedPackageId = null;
  /** @type {string|null} */
  let attemptId = null;
  let inFlight = false;
  const loadOffers = async () =>
    normalizeBillingOffers(await deps.loadOffers());
  /** @type {(packageId: string) => Promise<unknown>} */
  const startPurchase = async packageId => {
    if (inFlight) return { ignored: true };
    if (packageId !== selectedPackageId) {
      selectedPackageId = packageId;
      attemptId = deps.createUuid();
    }
    if (!attemptId) attemptId = deps.createUuid();
    inFlight = true;
    try {
      const token = await getPurchaseToken(deps);
      const checkoutAttemptId = attemptId;
      if (!checkoutAttemptId) throw new Error('Checkout attempt required');
      const response = await deps.bindEffectBoundary(permission =>
        deps.postCheckout(permission, packageId, token, checkoutAttemptId)
      );
      if (!isObjectRecord(response) || typeof response.url !== 'string')
        throw new Error('Invalid checkout response');
      const checkoutUrl = response.url;
      await deps.bindEffectBoundary(async permission => {
        deps.navigate(permission, checkoutUrl);
      });
      return response;
    } finally {
      inFlight = false;
    }
  };
  return {
    loadOffers,
    startPurchase,
    retry: () => retryPurchase(selectedPackageId, startPurchase),
    getAttemptId: () => attemptId,
  };
}

/**
 * Resolve a fresh Firebase token, signing in when necessary.
 * @param {{ getFreshToken: () => Promise<string|null>, signIn: () => Promise<void> }} deps Auth dependencies.
 * @returns {Promise<string>} Fresh token.
 */
async function getPurchaseToken(deps) {
  let token = await deps.getFreshToken();
  if (token) return token;
  await deps.signIn();
  token = await deps.getFreshToken();
  if (!token) throw new Error('Authentication required');
  return token;
}

/**
 * Retry the selected package attempt.
 * @param {string|null} packageId Selected package.
 * @param {(packageId: string) => Promise<unknown>} startPurchase Purchase function.
 * @returns {Promise<unknown>} Purchase result.
 */
function retryPurchase(packageId, startPurchase) {
  if (!packageId)
    return Promise.reject(new Error('No billing package selected'));
  return startPurchase(packageId);
}
