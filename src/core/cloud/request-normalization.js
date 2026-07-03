/** @typedef {import('../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../types/native-http').HttpRequestHeaders} HttpRequestHeaders */
/** @typedef {{ method?: string, body?: unknown, get?: (name: string) => string | null | undefined, headers?: unknown }} RequestLike */

/**
 * Normalize an Express-style request to the shape expected by cloud responders.
 * @param {RequestLike | undefined} request Incoming Express-like request.
 * @returns {{
 *   method: string | undefined,
 *   body: unknown,
 *   get: ((name: string) => string | null | undefined) | undefined,
 *   headers: HttpRequestHeaders | null | undefined,
 * }} Normalized request payload.
 */
export function normalizeExpressRequest(request) {
  return buildNormalizedRequest(request);
}

/**
 * @param {RequestLike | undefined} request Incoming Express-like request.
 * @returns {{
 *   method: string | undefined,
 *   body: unknown,
 *   get: ((name: string) => string | null | undefined) | undefined,
 *   headers: HttpRequestHeaders | null | undefined,
 * }} Normalized request payload.
 */
function buildNormalizedRequest(request) {
  return {
    method: resolveRequestMethod(request),
    body: resolveRequestBody(request),
    get: resolveRequestGetter(request),
    headers: resolveRequestHeaders(request),
  };
}

/**
 * @param {RequestLike | undefined} request Incoming Express request.
 * @returns {string | undefined} HTTP verb when available.
 */
function resolveRequestMethod(request) {
  return request?.method;
}

/**
 * @param {RequestLike | undefined} request Incoming Express request.
 * @returns {unknown} Body payload stored on the request.
 */
function resolveRequestBody(request) {
  return request?.body;
}

/**
 * @param {RequestLike | undefined} request Incoming Express request.
 * @returns {HttpRequestHeaders | null | undefined} Headers provided by the request.
 */
function resolveRequestHeaders(request) {
  return /** @type {HttpRequestHeaders | null | undefined} */ (
    request?.headers
  );
}

/**
 * Read the Express getter candidate from the request.
 * @param {RequestLike | undefined} request Incoming Express request.
 * @returns {((name: string) => string | null | undefined) | undefined} Getter candidate.
 */
function resolveGetterCandidate(request) {
  return request?.get;
}

/**
 * Normalize a header getter into the shape expected by consumers.
 * @param {RequestLike | undefined} request Incoming Express request.
 * @returns {((name: string) => string | null | undefined) | undefined} Wrapped getter or undefined when there is no getter.
 */
function resolveRequestGetter(request) {
  const candidate = resolveGetterCandidate(request);
  if (typeof candidate !== 'function') {
    return undefined;
  }

  return name => candidate.call(request, name);
}
