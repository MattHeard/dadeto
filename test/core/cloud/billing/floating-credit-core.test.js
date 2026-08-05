import { expect, it } from '@jest/globals';
import { priceAndConsumeOperation } from '../../../../src/core/cloud/billing/floating-credit-core.js';
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
