/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{status: number, body: string | Record<string, unknown>}} BillingResponse */

/**
 * Create the permission-first Firestore transaction runner for billing.
 * @param {{runTransaction: (callback: (transaction: any) => Promise<BillingResponse>) => Promise<BillingResponse>}} db Firestore database.
 * @returns {(allowEffects: AllowEffects, update: (transaction: any) => Promise<BillingResponse>) => Promise<BillingResponse>} Permission-first transaction runner.
 */
export function createBillingTransactionRunner(db) {
  return function runBillingTransaction(allowEffects, update) {
    void allowEffects;
    return db.runTransaction(transaction => update(transaction));
  };
}
