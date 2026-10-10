import { readMetadata } from '../../core/payment-webhook-core.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create a permission-first writer for processed payment events.
 * @param {{collection: (name: string) => {doc: (id: string) => {set: (value: object, options?: object) => Promise<unknown>}}}} db Firestore database.
 * @returns {(allowEffects: AllowEffects, event: import('../../core/payment-webhook-core.js').PaymentEvent, uuid: string, status?: string) => Promise<void>} Payment event status writer.
 */
export function createMarkProcessedEventWriter(db) {
  return async function markProcessedEvent(
    allowEffects,
    event,
    uuid,
    status = 'applied'
  ) {
    void allowEffects;
    const createdAtMs =
      typeof event.created === 'number' ? event.created * 1000 : Date.now();
    await db.collection('payment-events').doc(event.id).set(
      {
        apiKeyUuid: uuid,
        type: event.type,
        status,
        purchaseId: readMetadata(event.data?.object ?? {}).purchase_id ?? null,
        createdAt: new Date(createdAtMs),
      },
      { merge: true }
    );
  };
}
