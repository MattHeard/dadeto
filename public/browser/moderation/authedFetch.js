import { ensureFunction } from '../browser-core.js';

/**
 * @typedef {{ headers?: object, [key: string]: any }} FetchOptions
 */

/**
 * Normalize header-like inputs into an object for fetch.
 * @param {Headers|FetchOptions|Record<string, any>|null|undefined} originalHeaders Header-like data.
 * @returns {Record<string, any>} Normalized headers map.
 */
function normalizeHeaders(originalHeaders) {
  const entries = getHeaderEntries(originalHeaders);
  if (entries) {
    return Object.fromEntries(entries);
  }

  return buildHeaderFallback(originalHeaders);
}

/**
 * Determine whether the runtime provides a `Headers` constructor that accepts the supplied value.
 * @param {unknown} value - Candidate header-like object.
 * @returns {value is Headers} True when the object is an instance of `Headers`.
 */
function isHeadersInstance(value) {
  if (typeof Headers === 'undefined') {
    return false;
  }

  return value instanceof Headers;
}

/**
 * Extract entries from a Headers-like object when accessible.
 * @param {unknown} value - Candidate header store.
 * @returns {Headers['entries'] | null} Iterator over header entries when available.
 */
function getHeaderEntries(value) {
  if (!isHeadersInstance(value)) {
    return null;
  }

  return value.entries();
}

/**
 * Clone non-`Headers` inputs into a plain object.
 * @param {FetchOptions|Record<string, any>|null|undefined} originalHeaders Header-like data.
 * @returns {Record<string, any>} Shallow copy of the provided headers.
 */
function buildHeaderFallback(originalHeaders) {
  return { ...(originalHeaders || {}) };
}

/**
 * Normalize successful responses and throw on HTTP errors.
 * @param {object|null|undefined} response - Raw fetch response or failure object.
 * @returns {*} Parsed JSON payload or the original response.
 */
function handleAuthedResponse(response) {
  if (!shouldProcessAuthedResponse(response)) {
    return response;
  }

  return parseAuthedResponse(response);
}

/**
 * Determine whether the provided response can be normalized.
 * @param {object|null|undefined} response - Candidate response object.
 * @returns {boolean} True when a response object with an `ok` flag is provided.
 */
function shouldProcessAuthedResponse(response) {
  return Boolean(response && typeof response.ok === 'boolean');
}

/**
 * Parse an authenticated response, throwing on HTTP failures.
 * @param {{ ok: boolean, status?: number, json?: () => any }} response - Validated fetch response.
 * @returns {*} Parsed JSON payload or the original response when no parser is available.
 */
function parseAuthedResponse(response) {
  ensureResponseOk(response);
  return getResponseBody(response);
}

/**
 * Ensure the response reported success before parsing.
 * @param {{ ok: boolean, status?: number }} response - Validated response object.
 * @returns {void}
 */
function ensureResponseOk(response) {
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
}

/**
 * Resolve the body payload for a successful response.
 * @param {{ json?: () => any }} response - Response providing an optional JSON parser.
 * @returns {*} Parsed JSON payload or the original response when parsing is unavailable.
 */
function getResponseBody(response) {
  if (typeof response.json === 'function') {
    return response.json();
  }

  return response;
}

/**
 * Create an authenticated fetch helper that injects the current ID token.
 * @param {{
 *   getIdToken: () => (string|Promise<string|null>|null),
 *   fetchJson: (url: string, init: FetchOptions) => Promise<{
 *     ok: boolean,
 *     status: number,
 *     json: () => any,
 *   } | any>,
 * }} deps Dependencies for token lookup and network access.
 * @returns {(url: string, init?: FetchOptions) => Promise<any>} Fetch helper adding an Authorization header.
 */
export const createAuthedFetch = ({ getIdToken, fetchJson }) => {
  validateAuthedFetchDeps(getIdToken, fetchJson);

  return async (url, init = {}) => {
    const token = await requireToken(getIdToken);
    const { headers: originalHeaders, ...rest } = init;
    const headers = buildAuthedHeaders(originalHeaders, token);
    const response = await fetchJson(url, { ...rest, headers });
    return handleAuthedResponse(response);
  };
};

/**
 * Ensure injected helpers are callable before wiring the auth helper.
 * @param {unknown} getIdToken - Candidate token getter.
 * @param {unknown} fetchJson - Candidate fetch helper.
 * @returns {void}
 */
function validateAuthedFetchDeps(getIdToken, fetchJson) {
  ensureFunction(getIdToken, 'getIdToken');
  ensureFunction(fetchJson, 'fetchJson');
}

/**
 * Retrieve a token from the provided getter, throwing when absent.
 * @param {() => (string|Promise<string|null>|null)} getIdToken - Getter returning the ID token.
 * @returns {Promise<string>} Promise resolving to the ID token.
 */
async function requireToken(getIdToken) {
  const token = await getIdToken();
  if (!token) {
    throw new Error('not signed in');
  }

  return token;
}

/**
 * Compose headers for authenticated requests, injecting the ID token.
 * @param {FetchOptions|Record<string, any>|null|undefined} originalHeaders - Headers from the caller.
 * @param {string} token - Valid ID token.
 * @returns {Record<string, string>} Headers map used for the authenticated fetch.
 */
function buildAuthedHeaders(originalHeaders, token) {
  return {
    'Content-Type': 'application/json',
    ...normalizeHeaders(originalHeaders),
    Authorization: `Bearer ${token}`,
  };
}
