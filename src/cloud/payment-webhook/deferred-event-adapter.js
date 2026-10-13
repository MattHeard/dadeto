import { readPersistedPaymentEvent } from '../../core/cloud/payment-webhook/deferred-event-core.js';

/**
 * Create a permission-first reader for one purchase's deferred events.
 * @param {{collection: (name: string) => {where: (field: string, op: string, value: unknown) => {get: () => Promise<{docs: Array<{data: () => Record<string, unknown>}>}>}}}} db Firestore database.
 * @returns {(allowEffects: import('../../../types/allow-effects').AllowEffects, purchaseId: string) => Promise<import('../../core/payment-webhook-core.js').PaymentEvent[]>} Reader.
 */
export function createDeferredPaymentEventReader(db) {
  return async function readDeferredPaymentEvents(allowEffects, purchaseId) {
    void allowEffects;
    const snapshot = await db
      .collection('payment-events')
      .where('purchaseId', '==', purchaseId)
      .get();
    return snapshot.docs
      .map(doc => doc.data())
      .filter(record => record.status === 'deferred')
      .map(record => readPersistedPaymentEvent(record.verifiedEvent))
      .filter(event => event !== null)
      .sort((left, right) => {
        const createdDifference =
          Number(left.created ?? 0) - Number(right.created ?? 0);
        return createdDifference || left.id.localeCompare(right.id);
      });
  };
}
