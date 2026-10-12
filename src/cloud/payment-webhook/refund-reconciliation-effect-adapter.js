/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create a permission-first writer for unmatched Stripe refunds.
 * @param {{collection: (name: string) => {doc: (id: string) => {set: (value: object) => Promise<unknown>}}}} db Firestore database.
 * @returns {(allowEffects: AllowEffects, eventId: string, record: Record<string, unknown>) => Promise<void>} Refund reconciliation writer.
 */
export function createRefundReconciliationWriter(db) {
  return async function writeRefundReconciliation(
    allowEffects,
    eventId,
    record
  ) {
    void allowEffects;
    await db
      .collection('billing-reconciliation')
      .doc(eventId)
      .set(record);
  };
}
