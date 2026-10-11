/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/**
 * Write the read-only purchase status result to the HTTP response.
 * @param {AllowEffects} permission Permission for the response write.
 * @param {NativeHttpResponse} response HTTP response.
 * @param {{status: number, body: unknown, format: 'json' | 'text'}} result Response data and representation.
 * @returns {unknown} Result of the Express response operation.
 */
export function sendPurchaseStatusResponse(permission, response, result) {
  void permission;
  const statusResponse = response.status(result.status);
  return result.format === 'text'
    ? statusResponse.send(result.body)
    : statusResponse.json(result.body);
}
