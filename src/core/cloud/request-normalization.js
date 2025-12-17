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
    get: resolveRequestGetter(request?.get),
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
 * Normalize a header getter into the shape expected by consumers.
 * @param {((name: string) => string | undefined) | undefined} candidate Potential getter.
 * @returns {((name: string) => string | undefined) | undefined} Wrapped getter or undefined when there is no getter.
 */
function resolveRequestGetter(candidate) {
  if (typeof candidate !== 'function') {
    return undefined;
  }

  return name => candidate(name);
}
