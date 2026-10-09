/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{ debug?: (...args: unknown[]) => void, error?: (...args: unknown[]) => void }} ErrorBeaconLogger */

/** Log startup diagnostics at the Cloud Function boundary. */
export function logDebug(allowEffects, logger, message, data) {
  void allowEffects;
  logger?.debug?.(message, data);
}

/** Log error forwarding failures at the Cloud Function boundary. */
export function logError(allowEffects, logger, message, error) {
  void allowEffects;
  logger?.error?.(message, error);
}
