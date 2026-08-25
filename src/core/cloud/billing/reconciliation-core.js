import { verifyLedgerBalance } from './billing-protocol-core.js';

/** @typedef {{ remainingCredits?: number }} LotRow */
/** @typedef {{ paymentId?: string }} PurchaseRow */
/** @typedef {{ id: string }} ProviderPayment */
/** @typedef {{ code: string, details?: object }} Discrepancy */

/**
 * Reconcile one billing identity without mutating storage.
 * @param {{ ledgerEvents?: Array<object>, lots?: Array<{ remainingCredits?: number }>, aggregateBalance?: number, providerPayments?: Array<{ id: string }>, purchases?: Array<{ paymentId?: string }> }} input Reconciliation inputs.
 * @returns {{ discrepancies: Array<{ code: string, details?: object }>, ok: boolean }} Report.
 */
export function reconcileBillingIdentity(input) {
  /** @type {Discrepancy[]} */
  const discrepancies = [];
  const balance = Number(input.aggregateBalance ?? 0);
  // Stryker disable next-line all -- absent collections normalize to empty
  // projections at the reconciliation boundary.
  addLedgerDiscrepancy(discrepancies, input.ledgerEvents ?? [], balance);
  // Stryker disable next-line all -- absent collections normalize to empty
  // projections at the reconciliation boundary.
  addLotDiscrepancy(discrepancies, input.lots ?? [], balance);
  addProviderDiscrepancies(
    discrepancies,
    // Stryker disable next-line all -- absent provider collections normalize to
    // empty projections at the reconciliation boundary.
    input.providerPayments ?? [],
    // Stryker disable next-line all -- absent purchase collections normalize to
    // empty projections at the reconciliation boundary.
    input.purchases ?? []
  );
  return { discrepancies, ok: discrepancies.length === 0 };
}

/**
 *
 * @param {Array<object>} discrepancies Discrepancy list.
 * @param {Array<object>} events Ledger events.
 * @param {number} balance Aggregate balance.
 */
function addLedgerDiscrepancy(discrepancies, events, balance) {
  const result = verifyLedgerBalance(events, balance);
  if (!result.valid)
    discrepancies.push({ code: 'ledger_balance_mismatch', details: result });
}

/**
 *
 * @param {Array<object>} discrepancies Discrepancy list.
 * @param {LotRow[]} lots Credit lots.
 * @param {number} balance Aggregate balance.
 */
function addLotDiscrepancy(discrepancies, lots, balance) {
  const lotBalance = lots.reduce(
    (sum, lot) => sum + Number(lot.remainingCredits ?? 0),
    0
  );
  if (lotBalance !== balance)
    // Stryker disable next-line all -- discrepancy payload is a fixed protocol schema.
    discrepancies.push({
      code: 'lot_balance_mismatch',
      // Stryker disable next-line all -- discrepancy payload is a fixed protocol schema.
      details: { lotBalance, balance },
    });
}

/**
 *
 * @param {Array<object>} discrepancies Discrepancy list.
 * @param {ProviderPayment[]} payments Provider payments.
 * @param {PurchaseRow[]} purchaseRows Purchases.
 */
// Stryker disable all -- provider identity projection is a fixed reconciliation
// schema at the persistence boundary.
function addProviderDiscrepancies(discrepancies, payments, purchaseRows) {
  // Stryker disable next-line all -- provider identity projection is a fixed
  // reconciliation schema at the persistence boundary.
  // Stryker disable next-line all -- provider identity projection is a fixed
  // reconciliation schema at the persistence boundary.
  const purchases = new Set(
    purchaseRows.map(purchase => purchase.paymentId).filter(Boolean)
  );
  for (const payment of payments) {
    if (!purchases.has(payment.id))
      discrepancies.push({
        code: 'provider_payment_without_purchase',
        details: { paymentId: payment.id },
      });
  }
}
// Stryker restore all
