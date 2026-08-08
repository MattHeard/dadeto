import {
  calculateRefundUsdMinor,
  consumeCreditLots,
  isUntouchedLot,
} from '../../../../src/core/cloud/billing/credit-lots.js';

describe('credit lots facade', () => {
  it('forwards all credit-lot operations', () => {
    const lot = {
      purchaseId: 'purchase',
      issuedCredits: 10,
      remainingCredits: 10,
      createdAt: '2026-01-01',
      refundable: true,
    };
    expect(isUntouchedLot(lot)).toBe(true);
    expect(consumeCreditLots([lot], 2).remaining).toBe(8);
    expect(calculateRefundUsdMinor(lot, 10, 2)).toBe(5);
  });
});
