/**
 * @typedef {{ headers?: object, [key: string]: any }} FetchOptions
 */

/**
 * Normalize header-like inputs into an object for fetch.
 * @param {Headers|FetchOptions|Record<string, any>|null|undefined} originalHeaders Header-like data.
 * @returns {Record<string, any>} Normalized headers map.
 */
function normalizeHeaders(originalHeaders) {
  if (typeof Headers !== 'undefined' && originalHeaders instanceof Headers) {
    return Object.fromEntries(originalHeaders.entries());
  }

  return { ...(originalHeaders || {}) };
}

/**
 * Normalize successful responses and throw on HTTP errors.
 * @param {object|null|undefined} response Raw fetch response or failure object.
 * @returns {*} Parsed JSON payload or the original response.
 */
function handleAuthedResponse(response) {
  if (!response || typeof response.ok !== 'boolean') {
    return response;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

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
  if (typeof getIdToken !== 'function') {
    throw new TypeError('getIdToken must be a function');
  }
  if (typeof fetchJson !== 'function') {
    throw new TypeError('fetchJson must be a function');
  }

  return async (url, init = {}) => {
    const token = await getIdToken();
    if (!token) throw new Error('not signed in');

    const { headers: originalHeaders, ...rest } = init;
    const headers = {
      'Content-Type': 'application/json',
      ...normalizeHeaders(originalHeaders),
      Authorization: `Bearer ${token}`,
    };

    const response = await fetchJson(url, {
      ...rest,
      headers,
    });

    return handleAuthedResponse(response);
  };
};
