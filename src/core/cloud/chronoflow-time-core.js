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
 * @typedef {object} ChronoflowHttpResponse
 * @property {(code: number) => ChronoflowHttpResponse} status Set status and retain the response chain.
 * @property {(name: string, value: string) => ChronoflowHttpResponse} set Set response header.
 * @property {(body: unknown) => ChronoflowHttpResponse} json Send JSON response.
 * @property {(body: string) => ChronoflowHttpResponse} send Send text response.
 */

/**
 * Handle the public GET-only Chronoflow time endpoint.
 * @param {{method?: string}} request HTTP request method.
 * @param {ChronoflowHttpResponse} response HTTP response.
 * @param {() => number} epochClock Authoritative server clock.
 * @returns {unknown} Express response.
 */
export function handleChronoflowTime(request, response, epochClock) {
  if (request.method === 'OPTIONS') {
    const result = createChronoflowTimeResponse(() => 1);
    for (const [name, value] of Object.entries(result.headers)) {
      response.set(name, value);
    }
    return response.status(204).send('');
  }
  if (request.method !== 'GET') {
    return response.status(405).set('Allow', 'GET').send('Method not allowed');
  }
  const result = createChronoflowTimeResponse(epochClock);
  for (const [name, value] of Object.entries(result.headers)) {
    response.set(name, value);
  }
  return response.status(result.status).json(result.body);
}
