import {
  calculateOperationCredits,
  calculatePackageCredits,
  createPricingSnapshot,
  quoteCreditPackage,
  SCALE,
} from '../../../../src/core/cloud/billing/pricing.js';

describe('pricing facade', () => {
  it('forwards pricing operations and constants', () => {
    const snapshot = createPricingSnapshot({
      snapshotId: 'snapshot',
      effectiveAt: '2026-01-01T00:00:00.000Z',
      eurPerUsdMicros: 920_000,
      creditEurMicros: 1,
      markupBps: 1_000,
      operations: [{ id: 'invoke', costEurMicros: 50 }],
    });

    expect(SCALE).toBe(1_000_000);
    expect(calculatePackageCredits(100, snapshot)).toBe(920_000);
    expect(calculateOperationCredits('invoke', snapshot)).toBe(55);
    expect(
      quoteCreditPackage({ id: 'small', amountUsdMinor: 100 }, snapshot)
    ).toEqual({
      packageId: 'small',
      amountUsdMinor: 100,
      credits: 920_000,
      snapshotId: 'snapshot',
    });
  });
});
