import { quoteCreditPackage } from './pricing-core.js';

/**
 * Create the public package-offer handler.
 * @param {{ listActivePackages: () => Promise<Array<{ packageId: string, active: boolean, amountUsdMinor: number }>>, getCurrentPricingSnapshot: () => Promise<object|null> }} deps Billing read boundary.
 * @returns {() => Promise<{ status: number, body: object }>} HTTP-shaped handler.
 */
export function createPublicBillingOffersHandler(deps) {
  return async () => {
    const [packages, snapshot] = await Promise.all([
      deps.listActivePackages(),
      deps.getCurrentPricingSnapshot(),
    ]);
    if (!snapshot)
      return { status: 503, body: { error: 'billing_pricing_unavailable' } };
    return {
      status: 200,
      body: {
        packages: packages
          .filter(packageData => packageData.active === true)
          .map(packageData => {
            const quote = quoteCreditPackage(
              {
                id: packageData.packageId,
                amountUsdMinor: packageData.amountUsdMinor,
              },
              snapshot
            );
            return {
              packageId: quote.packageId,
              currency: 'usd',
              amountUsdMinor: quote.amountUsdMinor,
              credits: quote.credits,
            };
          }),
      },
    };
  };
}
