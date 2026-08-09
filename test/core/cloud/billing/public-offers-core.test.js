import { describe, expect, it, jest } from '@jest/globals';
import { createPublicBillingOffersHandler } from '../../../../src/core/cloud/billing/public-offers-core.js';

const snapshot = {
  snapshotId: 'current',
  effectiveAt: '2026-08-09T00:00:00.000Z',
  eurPerUsdMicros: 920000,
  creditEurMicros: 1,
  markupBps: 0,
  operations: {},
};

describe('public billing offers', () => {
  it('returns active server-priced offers without pricing internals', async () => {
    const handle = createPublicBillingOffersHandler({
      listActivePackages: jest.fn(async () => [
        { packageId: 'usd-10', active: true, amountUsdMinor: 1000 },
        { packageId: 'disabled', active: false, amountUsdMinor: 1000 },
      ]),
      getCurrentPricingSnapshot: jest.fn(async () => snapshot),
    });
    await expect(handle()).resolves.toEqual({
      status: 200,
      body: {
        packages: [
          {
            packageId: 'usd-10',
            currency: 'usd',
            amountUsdMinor: 1000,
            credits: 9200000,
          },
        ],
      },
    });
  });
  it('fails explicitly when pricing is unavailable', async () => {
    const handle = createPublicBillingOffersHandler({
      listActivePackages: async () => [],
      getCurrentPricingSnapshot: async () => null,
    });
    await expect(handle()).resolves.toEqual({
      status: 503,
      body: { error: 'billing_pricing_unavailable' },
    });
  });
});
