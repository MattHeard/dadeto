import { calculateOperationCredits } from './pricing-core.js';
import {
  consumeCreditLots,
  calculateRefundUsdMinor,
} from './credit-lots-core.js';

/**
 * Apply an operation against FIFO lots using the supplied current snapshot.
 * @param {import('./credit-lots-core.js').CreditLot[]} lots Available lots.
 * @param {string} operationId Billable operation identifier.
 * @param {import('./pricing-core.js').PricingSnapshot} snapshot Current pricing snapshot.
 * @returns {{ amount: number, snapshotId: string, allocations: Array<{ purchaseId: string, amount: number }>, lots: import('./credit-lots-core.js').CreditLot[] }} Operation charge.
 */
export function priceAndConsumeOperation(lots, operationId, snapshot) {
  const amount = calculateOperationCredits(operationId, snapshot);
  const consumed = consumeCreditLots(lots, amount);
  return { amount, snapshotId: snapshot.snapshotId, ...consumed };
}

/**
 * Price the refundable unused portion of a purchase at the current rate.
 * @param {import('./credit-lots-core.js').CreditLot} lot Purchase lot.
 * @param {number} originalAmountUsdMinor Original payment amount in cents.
 * @param {import('./pricing-core.js').PricingSnapshot} snapshot Current pricing snapshot.
 * @returns {{ amountUsdMinor: number, remainingCredits: number, snapshotId: string }} Refund quote.
 */
export function quoteUnusedCreditRefund(lot, originalAmountUsdMinor, snapshot) {
  const creditsPerUsd =
    snapshot.eurPerUsdMicros / 100 / snapshot.creditEurMicros;
  return {
    amountUsdMinor: calculateRefundUsdMinor(
      lot,
      originalAmountUsdMinor,
      creditsPerUsd
    ),
    remainingCredits: lot.remainingCredits,
    snapshotId: snapshot.snapshotId,
  };
}
