import { expect, it } from '@jest/globals';
import {
  priceAndConsumeOperation,
  quoteUnusedCreditRefund,
} from '../../../../src/core/cloud/billing/floating-credit-core.js';
import { createPricingSnapshot } from '../../../../src/core/cloud/billing/pricing-core.js';

const snapshot = createPricingSnapshot({
  snapshotId: 'daily-1',
  effectiveAt: '2026-08-05T00:00:00.000Z',
  eurPerUsdMicros: 900_000,
  creditEurMicros: 1,
  markupBps: 0,
  operations: [{ id: 'function.invoke', costEurMicros: 5 }],
});

it('prices an operation at execution time and records its snapshot', () => {
  expect(
    priceAndConsumeOperation(
      [
        {
          purchaseId: 'p1',
          issuedCredits: 10,
          remainingCredits: 10,
          createdAt: '2026-08-01',
          refundable: true,
        },
      ],
      'function.invoke',
      snapshot
    )
  ).toMatchObject({
    amount: 5,
    snapshotId: 'daily-1',
    allocations: [{ purchaseId: 'p1', amount: 5 }],
  });
});

it('quotes the refundable unused credits at the current rate', () => {
  expect(
    quoteUnusedCreditRefund(
      { purchaseId: 'p1', issuedCredits: 50_000, remainingCredits: 45_000 },
      100,
      snapshot
    )
  ).toEqual({
    amountUsdMinor: 5,
    remainingCredits: 45_000,
    snapshotId: 'daily-1',
  });
  expect(
    quoteUnusedCreditRefund(
      { purchaseId: 'p2', issuedCredits: 50_000, remainingCredits: 45_000 },
      100,
      { ...snapshot, creditEurMicros: 2 }
    )
  ).toMatchObject({ amountUsdMinor: 10, snapshotId: 'daily-1' });
});
