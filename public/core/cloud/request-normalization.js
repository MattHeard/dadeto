/**
 * Normalize an Express-style request to the shape expected by cloud responders.
 * @param {import('express').Request | undefined} request Incoming Express request.
 * @returns {{
 *   method: string | undefined,
 *   body: unknown,
 *   get: (name: string) => string | undefined,
 *   headers: import('express').Request['headers'],
 * }} Normalized request payload.
 */
export function normalizeExpressRequest(request) {
  const normalized = request ?? {};

  return {
    method: normalized.method,
    body: normalized.body,
    get: resolveRequestGetter(normalized.get),
    headers: normalized.headers,
  };

  /**
   * Normalize a header getter into the shape expected by consumers.
   * @param {((name: string) => string | undefined) | undefined} candidate Potential getter.
   * @returns {((name: string) => string | undefined) | undefined} Wrapped getter or undefined.
   */
  function resolveRequestGetter(candidate) {
    if (typeof candidate !== 'function') {
      return undefined;
    }

    return name => candidate(name);
  }
}
