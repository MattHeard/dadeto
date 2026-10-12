/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** @param {AllowEffects} allowEffects Permission for response effects. @param {any} response HTTP response. @param {{status: number, body: string | Record<string, unknown>, headers?: Record<string, string>}} result Serialized response. */
export function sendPaymentWebhookResponse(allowEffects, response, result) {
  void allowEffects;
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    if (typeof value !== 'undefined') response.set?.(name, value);
  }
  const status = resolveWebhookStatus(result);
  if (result.body && typeof result.body === 'object') return response.status(status).json(result.body);
  return response.status(status).send(result.body);
}

/** @param {AllowEffects} allowEffects Permission for logging. @param {unknown} error Request failure. */
export function logPaymentWebhookError(allowEffects, error) {
  void allowEffects;
  console.error('payment webhook request failed', error);
}

function resolveWebhookStatus(result) {
  if (result.status === 200 && result.body && typeof result.body === 'object' && result.body.type === 'credit_added' && result.body.applied === true) return 201;
  return result.status;
}
