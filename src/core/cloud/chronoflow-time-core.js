/**
 * Build an authoritative network-time response for Chronoflow.
 * @param {() => number} epochClock Server runtime epoch source.
 * @returns {{status: number, headers: Record<string, string>, body: {epochMs: number}}} HTTP response details.
 */
export function createChronoflowTimeResponse(epochClock) {
  const epochMs = epochClock();
  if (!Number.isSafeInteger(epochMs) || epochMs <= 0) {
    throw new RangeError(
      'Server epoch clock must return positive safe integer milliseconds.'
    );
  }
  return {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    },
    body: { epochMs },
  };
}

/**
 * @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects
 */

/**
 * @typedef {object} ChronoflowHttpResponse
 * @property {(allowEffects: AllowEffects, code: number) => ChronoflowHttpResponse} status Set status and retain the response chain.
 * @property {(allowEffects: AllowEffects, name: string, value: string) => ChronoflowHttpResponse} set Set response header.
 * @property {(allowEffects: AllowEffects, body: unknown) => unknown} json Send JSON response.
 * @property {(allowEffects: AllowEffects, body: string) => unknown} send Send text response.
 */

/**
 * Handle the public GET-only Chronoflow time endpoint.
 * @param {AllowEffects} allowEffects Permission to write the HTTP response.
 * @param {{method?: string}} request HTTP request method.
 * @param {ChronoflowHttpResponse} response HTTP response.
 * @param {() => number} epochClock Authoritative server clock.
 * @returns {unknown} Express response.
 */
export function handleChronoflowTime(
  allowEffects,
  request,
  response,
  epochClock
) {
  if (request.method === 'OPTIONS') {
    const result = createChronoflowTimeResponse(() => 1);
    setResponseHeaders(allowEffects, response, result.headers);
    return response.status(allowEffects, 204).send(allowEffects, '');
  }
  if (request.method !== 'GET') {
    return response
      .status(allowEffects, 405)
      .set(allowEffects, 'Allow', 'GET')
      .send(allowEffects, 'Method not allowed');
  }
  const result = createChronoflowTimeResponse(epochClock);
  setResponseHeaders(allowEffects, response, result.headers);
  return response
    .status(allowEffects, result.status)
    .json(allowEffects, result.body);
}

/**
 * Set response headers through the permission-aware response adapter.
 * @param {AllowEffects} allowEffects Permission to write the HTTP response.
 * @param {ChronoflowHttpResponse} response HTTP response adapter.
 * @param {Record<string, string>} headers Response headers.
 */
function setResponseHeaders(allowEffects, response, headers) {
  for (const [name, value] of Object.entries(headers)) {
    response.set(allowEffects, name, value);
  }
}
