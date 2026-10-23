/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Adapt the permission-first chat handler to the Cloud Functions HTTP shape.
 * @param {{handleChat: (allowEffects: AllowEffects, request: object) => Promise<{status: number, body: unknown}>, allowedOrigins: string[]}} deps HTTP dependencies.
 * @returns {(allowEffects: AllowEffects, request: any, response: any) => Promise<unknown>} HTTP handler.
 */
export function createOpenAIChatHttpAdapter(deps) {
  const allowedOrigins = new Set(deps.allowedOrigins);
  return async function handleOpenAIChatHttp(allowEffects, request, response) {
    const origin = request.get?.('origin') ?? request.headers?.origin;
    if (origin && !allowedOrigins.has(origin))
      return sendJson(response, 403, { error: 'origin_not_allowed' });
    if (origin) {
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      if (!origin)
        return sendJson(response, 403, { error: 'origin_not_allowed' });
      response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.set(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Idempotency-Key'
      );
      response.set('Access-Control-Max-Age', '3600');
      return response.status(204).send('');
    }
    if (request.method !== 'POST')
      return sendJson(response, 405, { error: 'method_not_allowed' });
    const result = await deps.handleChat(allowEffects, request);
    return sendJson(response, result.status, result.body);
  };
}

/** @param {any} response Express response. @param {number} status HTTP status. @param {unknown} body Response body. */
function sendJson(response, status, body) {
  return response.status(status).json(body);
}
