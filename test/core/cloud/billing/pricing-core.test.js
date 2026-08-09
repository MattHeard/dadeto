import { describe, expect, it } from '@jest/globals';
import {
  calculateOperationCredits,
  calculatePackageCredits,
  createPricingSnapshot,
  quoteCreditPackage,
} from '../../../../src/core/cloud/billing/pricing-core.js';

const snapshot = createPricingSnapshot({
  snapshotId: '2026-08-05',
  effectiveAt: '2026-08-05T00:00:00.000Z',
  eurPerUsdMicros: 920_000,
  creditEurMicros: 1,
  markupBps: 1_000,
  operations: [{ id: 'function.invoke', costEurMicros: 50 }],
});

describe('pricing core', () => {
  it('quotes packages from the snapshot using downward rounding', () => {
    expect(calculatePackageCredits(1_000, snapshot)).toBe(9_200_000);
    expect(
      quoteCreditPackage({ id: 'usd-10', amountUsdMinor: 1_000 }, snapshot)
    ).toEqual({
      packageId: 'usd-10',
      amountUsdMinor: 1_000,
      credits: 9_200_000,
      snapshotId: '2026-08-05',
    });
  });

  it('prices operations from the current snapshot and rounds upward', () => {
    expect(calculateOperationCredits('function.invoke', snapshot)).toBe(55);
    const next = createPricingSnapshot({
      ...snapshot,
      snapshotId: '2026-08-06',
      operations: [{ id: 'function.invoke', costEurMicros: 51 }],
    });
    expect(calculateOperationCredits('function.invoke', next)).toBe(57);
  });

  it('rejects unknown operations and invalid rates', () => {
    expect(() => calculateOperationCredits('missing', snapshot)).toThrow(
      'Unknown billable operation'
    );
    expect(() =>
      createPricingSnapshot({ ...snapshot, eurPerUsdMicros: 0 })
    ).toThrow();
    expect(() =>
      createPricingSnapshot({ ...snapshot, creditEurMicros: 0 })
    ).toThrow();
    expect(() => createPricingSnapshot({ ...snapshot, markupBps: -1 })).toThrow(
      'markupBps'
    );
    expect(() =>
      createPricingSnapshot({ ...snapshot, markupBps: 1.5 })
    ).toThrow('markupBps');
    expect(() =>
      createPricingSnapshot({
        ...snapshot,
        operations: [{ id: 'bad', costEurMicros: 0 }],
      })
    ).toThrow('costEurMicros');
    expect(() => calculatePackageCredits(0, snapshot)).toThrow(
      'amountUsdMinor'
    );
    expect(() =>
      quoteCreditPackage({ id: 'bad', amountUsdMinor: 0 }, snapshot)
    ).toThrow('amountUsdMinor');
    const lowCost = createPricingSnapshot({
      ...snapshot,
      creditEurMicros: 1_000,
      operations: [{ id: 'function.invoke', costEurMicros: 5 }],
    });
    expect(calculateOperationCredits('function.invoke', lowCost)).toBe(1);
  });
});
