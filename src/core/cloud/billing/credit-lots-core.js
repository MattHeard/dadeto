/**
 * @typedef {{ purchaseId: string, issuedCredits: number, remainingCredits: number, createdAt: string, refundable: boolean }} CreditLot
 */

/**
 * Consume credits from lots in FIFO order.
 * @param {CreditLot[]} lots Purchase lots ordered oldest first.
 * @param {number} amount Credits to consume.
 * @returns {{ lots: CreditLot[], allocations: Array<{ purchaseId: string, amount: number }>, remaining: number }} Result.
 */
export function consumeCreditLots(lots, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new TypeError('amount must be a positive safe integer');
  }
  const total = lots.reduce((sum, lot) => sum + lot.remainingCredits, 0);
  if (total < amount) throw new Error('Insufficient credit');
  let outstanding = amount;
  /** @type {Array<{ purchaseId: string, amount: number }>} */
  const allocations = [];
  const updated = lots.map(lot => {
    const consumed = Math.min(lot.remainingCredits, outstanding);
    if (consumed > 0) {
      allocations.push({ purchaseId: lot.purchaseId, amount: consumed });
      outstanding -= consumed;
    }
    return { ...lot, remainingCredits: lot.remainingCredits - consumed };
  });
  return { lots: updated, allocations, remaining: total - amount };
}

/**
 * Determine whether a purchase can be fully refunded.
 * @param {CreditLot} lot Purchase lot.
 * @returns {boolean} True when no credits were consumed.
 */
export function isUntouchedLot(lot) {
  return lot.remainingCredits === lot.issuedCredits;
}

/**
 * Calculate the refundable USD amount for unused credits at the current rate.
 * @param {CreditLot} lot Purchase lot.
 * @param {number} originalAmountUsdMinor Original payment in USD cents.
 * @param {number} currentCreditsPerUsd Current credits per USD cent.
 * @returns {number} Refund amount in USD cents.
 */
export function calculateRefundUsdMinor(
  lot,
  originalAmountUsdMinor,
  currentCreditsPerUsd
) {
  if (
    !Number.isSafeInteger(originalAmountUsdMinor) ||
    originalAmountUsdMinor <= 0
  ) {
    throw new TypeError('originalAmountUsdMinor must be positive');
  }
  if (!Number.isFinite(currentCreditsPerUsd) || currentCreditsPerUsd <= 0) {
    throw new TypeError('currentCreditsPerUsd must be positive');
  }
  const currentValue = Math.floor(lot.remainingCredits / currentCreditsPerUsd);
  return Math.min(originalAmountUsdMinor, currentValue);
}
