import { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';
import { productionOrigins } from './cloud-core.js';

export { createDb } from './create-db.js';
export { productionOrigins };

const UUID_PATH_PATTERN = /\/api-keys\/([0-9a-fA-F-]{36})\/credit\/?$/;

/**
 * Attempt to execute the UUID path pattern against a value.
 * @param {unknown} value Value representing the request path.
 * @returns {RegExpExecArray|null} Regex match result when successful.
 */
function execUuidPathPattern(value) {
  if (typeof value !== 'string') {
    return null;
  }
  return UUID_PATH_PATTERN.exec(value);
}

/**
 * Attempt to read a UUID segment from a credit API request path.
 * @param {unknown} path Value representing the request path.
 * @returns {string} Matched UUID, or an empty string when no match exists.
 */
function matchPathUuid(path) {
  const match = execUuidPathPattern(path);
  if (match && typeof match[1] === 'string') {
    return match[1];
  }
  return '';
}

/**
 * Normalize a value into a UUID string.
 * @param {unknown} value Candidate value that may contain a UUID.
 * @returns {string} UUID string when valid, otherwise an empty string.
 */
function readUuid(value) {
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

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
  const resolvers = [
    () => matchPathUuid(request.path),
    () => readUuid(request.params?.uuid),
    () => readUuid(request.query?.uuid),
  ];

  for (const resolve of resolvers) {
    const value = resolve();
    if (value) {
      return value;
    }
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

  let resolveUuid = extractUuid;
  if (typeof getUuid === 'function') {
    resolveUuid = getUuid;
  }

  let errorLogger = () => {};
  if (typeof logError === 'function') {
    errorLogger = logError;
  }

  return async function handleRequest(request = {}) {
    let method = '';
    if (typeof request.method === 'string') {
      method = request.method;
    }
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
