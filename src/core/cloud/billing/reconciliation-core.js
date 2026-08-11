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
  addLedgerDiscrepancy(discrepancies, input.ledgerEvents ?? [], balance);
  addLotDiscrepancy(discrepancies, input.lots ?? [], balance);
  addProviderDiscrepancies(
    discrepancies,
    input.providerPayments ?? [],
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
    discrepancies.push({
      code: 'lot_balance_mismatch',
      details: { lotBalance, balance },
    });
}

/**
 *
 * @param {Array<object>} discrepancies Discrepancy list.
 * @param {ProviderPayment[]} payments Provider payments.
 * @param {PurchaseRow[]} purchaseRows Purchases.
 */
function addProviderDiscrepancies(discrepancies, payments, purchaseRows) {
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
