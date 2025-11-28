import { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';
import { productionOrigins } from './cloud-core.js';

export { createDb } from './create-db.js';
export { productionOrigins };

const UUID_PATH_PATTERN = /\/api-keys\/([0-9a-fA-F-]{36})\/credit\/?$/;

/**
 * Result of executing a UUID capturing regex.
 * @typedef {(
 *   Array<string> & {
 *     index: number,
 *     input: string,
 *     groups?: Record<string, string | undefined>,
 *   }
 * )} RegExpExecArray
 */

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
  return extractUuidFromMatch(match);
}

/**
 *
 * @param match
 */
function extractUuidFromMatch(match) {
  return sanitizeMatchUuid(match?.[1]);
}

/**
 *
 * @param value
 */
function sanitizeMatchUuid(value) {
  if (typeof value === 'string') {
    return value;
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
 * @param resolvers
 * @returns {string} Extracted UUID or an empty string when missing.
 */
function resolveFirstValue(resolvers) {
  let value = '';
  resolvers.find(resolve => {
    value = resolve();
    return Boolean(value);
  });

  return value;
}

/**
 *
 * @param request
 */
export function extractUuid(request = {}) {
  const resolvers = [
    () => matchPathUuid(request.path),
    () => readUuid(request.params?.uuid),
    () => readUuid(request.query?.uuid),
  ];

  return resolveFirstValue(resolvers);
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
export function createGetApiKeyCreditV2Handler(deps = {}) {
  const { fetchCredit, resolveUuid, errorLogger } =
    resolveV2HandlerDependencies(deps);

  return async function handleRequest(request = {}) {
    const method = deriveRequestMethod(request.method);
    const uuid = resolveUuid(request);
    const validationError = resolveRequestValidationError(method, uuid);

    return resolveRequestResponse(validationError, () =>
      fetchCreditResponse(fetchCredit, uuid, errorLogger)
    );
  };
}

/**
 *
 * @param root0
 * @param root0.fetchCredit
 * @param root0.getUuid
 * @param root0.logError
 */
function resolveV2HandlerDependencies({ fetchCredit, getUuid, logError }) {
  ensureFetchCredit(fetchCredit);

  return {
    fetchCredit,
    resolveUuid: resolveUuidDependency(getUuid),
    errorLogger: resolveErrorLogger(logError),
  };
}

/**
 *
 * @param fetchCredit
 */
function ensureFetchCredit(fetchCredit) {
  if (typeof fetchCredit !== 'function') {
    throw new TypeError('fetchCredit must be a function');
  }
}

/**
 *
 * @param getUuid
 */
function resolveUuidDependency(getUuid) {
  if (typeof getUuid === 'function') {
    return getUuid;
  }

  return extractUuid;
}

/**
 *
 * @param logError
 */
function resolveErrorLogger(logError) {
  if (typeof logError === 'function') {
    return logError;
  }

  return () => {};
}

/**
 *
 * @param method
 */
function deriveRequestMethod(method) {
  return typeof method === 'string' ? method : '';
}

/**
 *
 * @param method
 */
function resolveMethodError(method) {
  if (method !== 'GET') {
    return {
      status: 405,
      body: 'Method Not Allowed',
      headers: { Allow: 'GET' },
    };
  }

  return null;
}

/**
 *
 * @param method
 * @param uuid
 */
function resolveRequestValidationError(method, uuid) {
  const methodError = resolveMethodError(method);
  if (methodError) {
    return methodError;
  }

  return resolveUuidPresence(uuid);
}

/**
 *
 * @param validationError
 * @param onSuccess
 */
function resolveRequestResponse(validationError, onSuccess) {
  if (validationError) {
    return validationError;
  }

  return onSuccess();
}

/**
 *
 * @param uuid
 */
function resolveUuidPresence(uuid) {
  if (!uuid) {
    return missingUuidResponse();
  }

  return null;
}

/**
 *
 */
function missingUuidResponse() {
  return {
    status: 400,
    body: 'Missing UUID',
  };
}

/**
 *
 * @param fetchCredit
 * @param uuid
 * @param errorLogger
 */
async function fetchCreditResponse(fetchCredit, uuid, errorLogger) {
  try {
    const credit = await fetchCredit(uuid);
    return resolveCreditPayload(credit);
  } catch (error) {
    errorLogger(error);
    return internalErrorResponse();
  }
}

/**
 *
 * @param credit
 */
function resolveCreditPayload(credit) {
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
}

/**
 *
 */
function internalErrorResponse() {
  return {
    status: 500,
    body: 'Internal error',
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
    return getCreditFromSnapshot(snap);
  };
}

/**
 *
 * @param snap
 */
function getCreditFromSnapshot(snap) {
  if (!snap.exists) {
    return null;
  }

  let data;
  if (typeof snap.data === 'function') {
    data = snap.data();
  }

  if (data && typeof data.credit === 'number') {
    return data.credit;
  }

  return 0;
}
