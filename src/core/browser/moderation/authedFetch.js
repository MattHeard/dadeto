/**
 * Create an authenticated fetch helper that injects the current ID token.
 * @param {{
 *   getIdToken: () => (string|Promise<string|null>|null),
 *   fetchJson: (url: string, init: RequestInit) => Promise<{
 *     ok: boolean,
 *     status: number,
 *     json: () => any,
 *   } | any>,
 * }} deps Dependencies for token lookup and network access.
 * @returns {(url: string, init?: RequestInit) => Promise<any>} Fetch helper.
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

    const resolvedHeaders =
      typeof Headers !== 'undefined' && originalHeaders instanceof Headers
        ? Object.fromEntries(originalHeaders.entries())
        : { ...(originalHeaders || {}) };

    const headers = {
      'Content-Type': 'application/json',
      ...resolvedHeaders,
      Authorization: `Bearer ${token}`,
    };

    const response = await fetchJson(url, {
      ...rest,
      headers,
    });

    if (response && typeof response.ok === 'boolean') {
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      if (typeof response.json === 'function') {
        return response.json();
      }
    }

    return response;
  };
};
