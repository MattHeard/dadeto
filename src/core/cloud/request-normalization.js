/** @typedef {import('../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../types/native-http').HttpRequestHeaders} HttpRequestHeaders */

/**
 * Normalize an Express-style request to the shape expected by cloud responders.
 * @param {NativeHttpRequest | undefined} request Incoming Express-like request.
 * @returns {{
 *   method: string | undefined,
 *   body: unknown,
 *   get: ((name: string) => string | undefined) | undefined,
 *   headers: HttpRequestHeaders | undefined,
 * }} Normalized request payload.
 */
export function normalizeExpressRequest(request) {
  return buildNormalizedRequest(request);
}

/**
 * @param {NativeHttpRequest | undefined} request Incoming Express-like request.
 * @returns {{
 *   method: string | undefined,
 *   body: unknown,
 *   get: ((name: string) => string | undefined) | undefined,
 *   headers: HttpRequestHeaders | undefined,
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
 * @param {NativeHttpRequest | undefined} request Incoming Express request.
 * @returns {string | undefined} HTTP verb when available.
 */
function resolveRequestMethod(request) {
  return request?.method;
}

/**
 * @param {NativeHttpRequest | undefined} request Incoming Express request.
 * @returns {unknown} Body payload stored on the request.
 */
function resolveRequestBody(request) {
  return request?.body;
}

/**
 * @param {NativeHttpRequest | undefined} request Incoming Express request.
 * @returns {HttpRequestHeaders | undefined} Headers provided by the request.
 */
function resolveRequestHeaders(request) {
  return request?.headers;
}

/**
 * Read the Express getter candidate from the request.
 * @param {NativeHttpRequest | undefined} request Incoming Express request.
 * @returns {((name: string) => string | undefined) | undefined} Getter candidate.
 */
function resolveGetterCandidate(request) {
  return request?.get;
}

/**
 * Normalize a header getter into the shape expected by consumers.
 * @param {NativeHttpRequest | undefined} request Incoming Express request.
 * @returns {((name: string) => string | undefined) | undefined} Wrapped getter or undefined when there is no getter.
 */
function resolveRequestGetter(request) {
  const candidate = resolveGetterCandidate(request);
  if (typeof candidate !== 'function') {
    return undefined;
  }

  return name => candidate.call(request, name);
}
