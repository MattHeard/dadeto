import { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';

const UUID_PATH_PATTERN = /\/api-keys\/([0-9a-fA-F-]{36})\/credit\/?$/;

/**
 * Extract an API key UUID from a request-like object.
 * @param {{
 *   path?: string,
 *   params?: Record<string, unknown>,
 *   query?: Record<string, unknown>,
 * }} [request] Incoming request data.
 * @returns {string} Extracted UUID or an empty string when missing.
 */
export function extractUuid(request = {}) {
  if (typeof request.path === 'string') {
    const match = request.path.match(UUID_PATH_PATTERN);
    if (match) {
      return match[1];
    }
  }

  const paramsUuid = request.params?.uuid;
  if (typeof paramsUuid === 'string' && paramsUuid) {
    return paramsUuid;
  }

  const queryUuid = request.query?.uuid;
  if (typeof queryUuid === 'string' && queryUuid) {
    return queryUuid;
  }

  return '';
}

/**
 * Factory for the HTTPS handler serving API key credit data.
 * @param {{
 *   fetchCredit: (uuid: string) => Promise<number | null>,
 *   getUuid?: (request: unknown) => string,
 *   logError?: (error: unknown) => void,
 * }} deps Runtime dependencies for the handler.
 * @returns {(request: { method?: string } & Record<string, unknown>) => Promise<{
 *   status: number,
 *   body: string | { credit: number },
 *   headers?: Record<string, string>,
 * }>} Handler producing HTTP response metadata.
 */
export function createGetApiKeyCreditV2Handler({
  fetchCredit,
  getUuid = extractUuid,
  logError,
} = {}) {
  if (typeof fetchCredit !== 'function') {
    throw new TypeError('fetchCredit must be a function');
  }

  const resolveUuid = typeof getUuid === 'function' ? getUuid : extractUuid;
  const errorLogger = typeof logError === 'function' ? logError : () => {};

  return async function handleRequest(request = {}) {
    const method = typeof request.method === 'string' ? request.method : '';
    if (method !== 'GET') {
      return {
        status: 405,
        body: 'Method Not Allowed',
        headers: { Allow: 'GET' },
      };
    }

    const uuid = resolveUuid(request);
    if (!uuid) {
      return {
        status: 400,
        body: 'Missing UUID',
      };
    }

    try {
      const credit = await fetchCredit(uuid);
      if (credit === null) {
        return {
          status: 404,
          body: 'Not found',
        };
      }

      return {
        status: 200,
        body: { credit },
      };
    } catch (error) {
      errorLogger(error);
      return {
        status: 500,
        body: 'Internal error',
      };
    }
  };
}

/**
 * Create a fetchCredit function bound to the supplied Firestore database.
 * @param {import('@google-cloud/firestore').Firestore} db Firestore instance to use for lookups.
 * @returns {(uuid: string) => Promise<number|null>} Function to fetch credit.
 */
export function createFetchCredit(db) {
  return async function fetchCredit(uuid) {
    const snap = await getApiKeyCreditSnapshot(db, uuid);
    if (!snap.exists) {
      return null;
    }
    const data = snap.data() || {};
    return data.credit ?? 0;
  };
}
