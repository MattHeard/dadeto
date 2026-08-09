import { describe, expect, it } from '@jest/globals';
import {
  calculateRefundUsdMinor,
  consumeCreditLots,
  isUntouchedLot,
} from '../../../../src/core/cloud/billing/credit-lots-core.js';

const lots = [
  {
    purchaseId: 'old',
    issuedCredits: 100,
    remainingCredits: 100,
    createdAt: '2026-08-01',
    refundable: true,
  },
  {
    purchaseId: 'new',
    issuedCredits: 50,
    remainingCredits: 50,
    createdAt: '2026-08-02',
    refundable: true,
  },
];

describe('credit lots', () => {
  it('consumes oldest lots first and records allocations', () => {
    expect(consumeCreditLots(lots, 120)).toEqual({
      lots: [
        { ...lots[0], remainingCredits: 0 },
        { ...lots[1], remainingCredits: 30 },
      ],
      allocations: [
        { purchaseId: 'old', amount: 100 },
        { purchaseId: 'new', amount: 20 },
      ],
      remaining: 30,
    });
  });

  it('rejects overdrafts and identifies untouched lots', () => {
    expect(() => consumeCreditLots(lots, 151)).toThrow('Insufficient credit');
    expect(() => consumeCreditLots(lots, 0)).toThrow('positive safe integer');
    expect(() => consumeCreditLots(lots, -1)).toThrow('positive safe integer');
    expect(() => consumeCreditLots(lots, 1.5)).toThrow('positive safe integer');
    expect(isUntouchedLot(lots[0])).toBe(true);
    expect(isUntouchedLot({ ...lots[0], remainingCredits: 99 })).toBe(false);
    expect(
      consumeCreditLots(
        [
          { ...lots[0], remainingCredits: 1 },
          { ...lots[1], remainingCredits: 0 },
        ],
        1
      ).allocations
    ).toEqual([{ purchaseId: 'old', amount: 1 }]);
  });

  it('caps current-value refunds at the original payment', () => {
    expect(
      calculateRefundUsdMinor({ ...lots[0], remainingCredits: 50 }, 1_000, 1)
    ).toBe(50);
    expect(calculateRefundUsdMinor(lots[0], 1_000, 0.01)).toBe(1_000);
    expect(() => calculateRefundUsdMinor(lots[0], 0, 1)).toThrow(
      'originalAmountUsdMinor'
    );
    expect(() => calculateRefundUsdMinor(lots[0], 1.5, 1)).toThrow(
      'originalAmountUsdMinor'
    );
    expect(() => calculateRefundUsdMinor(lots[0], 1_000, 0)).toThrow(
      'currentCreditsPerUsd'
    );
    expect(() => calculateRefundUsdMinor(lots[0], 1_000, Number.NaN)).toThrow(
      'currentCreditsPerUsd'
    );
  });
});
