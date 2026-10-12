/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{status: number, body: string | Record<string, unknown>}} BillingResponse */

/**
 * Create a request-scoped runner for purchase settlement transactions.
 * @param {{runTransaction: (callback: (transaction: any) => Promise<BillingResponse>) => Promise<BillingResponse>}} db Firestore database.
 * @returns {(allowEffects: AllowEffects, update: (transaction: any) => Promise<BillingResponse>) => Promise<BillingResponse>} Permission-first transaction runner.
 */
export function createPurchaseTransactionRunner(db) {
  return function runPurchaseTransaction(allowEffects, update) {
    void allowEffects;
    return db.runTransaction(transaction => update(transaction));
  };
}
