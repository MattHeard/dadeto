/**
 * Persist only the verified provider event fields needed for replay.
 * @param {import('../../payment-webhook-core.js').PaymentEvent} event Verified provider event.
 * @returns {Record<string, unknown>} Plain event snapshot.
 */
export function createPersistedPaymentEvent(event) {
  return {
    id: event.id,
    type: event.type,
    data: event.data ?? {},
    ...(event.livemode === undefined ? {} : { livemode: event.livemode }),
    ...(event.created === undefined ? {} : { created: event.created }),
    ...(event.api_version === undefined
      ? {}
      : { ['api_version']: event.api_version }),
    ...(event.request === undefined ? {} : { request: event.request }),
  };
}

/**
 * Validate a stored event before allowing it into replay processing.
 * @param {unknown} value Stored event value.
 * @returns {import('../../payment-webhook-core.js').PaymentEvent|null} Event or null.
 */
export function readPersistedPaymentEvent(value) {
  if (!value || typeof value !== 'object') return null;
  const event = /** @type {Record<string, unknown>} */ (value);
  if (typeof event.id !== 'string' || typeof event.type !== 'string')
    return null;
  if (event.data !== undefined && typeof event.data !== 'object') return null;
  return /** @type {import('../../payment-webhook-core.js').PaymentEvent} */ (
    event
  );
}
