/**
 * Build a handler that retrieves credit information for an API key.
 * @param {{
 *   fetchCredit: (uuid: string) => Promise<number | null | undefined>,
 *   getUuid: (request: unknown) => string | undefined,
 * }} dependencies Required dependencies for the handler.
 * @returns {(request: Record<string, unknown>) => Promise<{ status: number, body: unknown }>} Handler function.
 */
export function createGetApiKeyCreditHandler({ fetchCredit, getUuid }) {
  if (typeof fetchCredit !== 'function') {
    throw new TypeError('fetchCredit must be a function');
  }

  if (typeof getUuid !== 'function') {
    throw new TypeError('getUuid must be a function');
  }

  return async function handleRequest(request = {}) {
    const { method = 'POST' } = request;

    if (typeof method === 'string' && method.toUpperCase() !== 'POST') {
      return { status: 405, body: 'Method Not Allowed' };
    }

    const uuid =
      request.uuid !== undefined && request.uuid !== null && request.uuid !== ''
        ? request.uuid
        : getUuid(request);

    if (!uuid) {
      return { status: 400, body: 'Missing UUID' };
    }

    try {
      const credit = await fetchCredit(uuid);

      if (credit === null) {
        return { status: 404, body: 'Not found' };
      }

      if (credit === undefined) {
        return { status: 500, body: 'Internal error' };
      }

      return { status: 200, body: { credit } };
    } catch (error) {
      return { status: 500, body: 'Internal error' };
    }
  };
}
