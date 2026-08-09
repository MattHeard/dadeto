/* eslint-disable complexity, jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
/**
 * Normalize the public server-priced package response.
 * @param {unknown} value Server response.
 * @returns {Array<{ packageId: string, currency: string, amountUsdMinor: number, credits: number }>} Offers.
 */
export function normalizeBillingOffers(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.packages))
    throw new TypeError('Invalid billing package response');
  return value.packages.map(normalizeBillingOffer);
}

/**
 * Normalize one display-ready offer.
 * @param offer
 */
function normalizeBillingOffer(offer) {
  if (!offer || typeof offer !== 'object')
    throw new TypeError('Invalid billing package');
  const { packageId, currency, amountUsdMinor, credits } = offer;
  if (
    typeof packageId !== 'string' ||
    currency !== 'usd' ||
    !Number.isSafeInteger(amountUsdMinor) ||
    amountUsdMinor <= 0 ||
    !Number.isSafeInteger(credits) ||
    credits <= 0
  )
    throw new TypeError('Invalid billing package');
  return { packageId, currency, amountUsdMinor, credits };
}

/**
 * Create the deterministic billing purchase controller.
 * @param {{ loadOffers: () => Promise<unknown>, getFreshToken: () => Promise<string|null>, signIn: () => Promise<void>, createUuid: () => string, postCheckout: (packageId: string, token: string, attemptId: string) => Promise<unknown>, navigate: (url: string) => void }} deps Browser boundaries.
 * @returns {{ loadOffers: () => Promise<unknown>, startPurchase: (packageId: string) => Promise<unknown>, retry: () => Promise<unknown>, getAttemptId: () => string|null }} Controller.
 */
export function createBillingController(deps) {
  let selectedPackageId = null;
  let attemptId = null;
  let inFlight = false;
  const loadOffers = async () =>
    normalizeBillingOffers(await deps.loadOffers());
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
      const response = await deps.postCheckout(packageId, token, attemptId);
      if (
        !response ||
        typeof response !== 'object' ||
        typeof response.url !== 'string'
      )
        throw new Error('Invalid checkout response');
      deps.navigate(response.url);
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
 *
 * @param deps
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
 *
 * @param packageId
 * @param startPurchase
 */
function retryPurchase(packageId, startPurchase) {
  if (!packageId)
    return Promise.reject(new Error('No billing package selected'));
  return startPurchase(packageId);
}
