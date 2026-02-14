import { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';
import { getNumericValueOrZero, productionOrigins } from './cloud-core.js';
import {
  ensureString,
  functionOrFallback,
  stringOrDefault,
  whenString,
} from './common-core.js';

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
  return whenString(value, uuidCandidate =>
    UUID_PATH_PATTERN.exec(uuidCandidate)
  );
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
 * Extract the UUID capture from a regex match result.
 * @param {RegExpExecArray | null} match Result of applying the UUID path regex.
 * @returns {string} Normalized UUID string when the match succeeds.
 */
function extractUuidFromMatch(match) {
  return ensureString(match?.[1]);
}

/**
 * Normalize a string-like value into a UUID candidate.
 * @param {unknown} value Candidate value that may contain a UUID.
 * @returns {string} UUID string when valid, otherwise an empty string.
 */
/**
 * Invoke resolvers until one produces a value.
 * @param {Array<() => string>} resolvers Candidate value resolvers.
 * @returns {string} First non-empty string returned by a resolver.
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
 * Extract an API key UUID from a request-like object.
 * @param {unknown} [request] Incoming request data.
 * @returns {string} Extracted UUID or an empty string when missing.
 */
export function extractUuid(request) {
  if (!request || typeof request !== 'object') {
    return '';
  }

  const typedRequest = /** @type {{ path?: string, params?: Record<string, unknown>, query?: Record<string, unknown> }} */ (request);
  const resolvers = [
    () => matchPathUuid(typedRequest.path),
    () => ensureString(typedRequest.params?.uuid),
    () => ensureString(typedRequest.query?.uuid),
  ];

  return resolveFirstValue(resolvers);
}

/**
 * @typedef {{
 *   fetchCredit?: (uuid: string) => Promise<number | null>,
 *   getUuid?: (request: unknown) => string,
 *   logError?: (error: unknown) => void,
 * }} HandlerDependencies
 */

/**
 * Factory for the HTTPS handler serving API key credit data.
 * @param {HandlerDependencies} [deps] Runtime dependencies for the handler.
 * @returns {(request: { method?: string } & Record<string, unknown>) => Promise<{
 *   status: number,
 *   body: string | { credit: number },
 *   headers?: Record<string, string>,
 * }>} Handler producing HTTP response metadata.
 */
export function createGetApiKeyCreditV2Handler(deps) {
  deps = deps || {};
  const { fetchCredit, resolveUuid, errorLogger } =
    resolveV2HandlerDependencies(/** @type {HandlerDependencies} */ (deps));

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
 * @typedef {{
 *   fetchCredit: (uuid: string) => Promise<number | null>,
 *   resolveUuid: (request: unknown) => string,
 *   errorLogger: (error: unknown) => void,
 * }} ResolvedHandlerDependencies
 */

/**
 * Resolve runtime dependencies for the API handler.
 * @param {HandlerDependencies} deps Handler dependencies.
 * @returns {ResolvedHandlerDependencies} Runtime helpers for the handler.
 */
function resolveV2HandlerDependencies(deps) {
  const { fetchCredit, getUuid, logError } = deps;
  ensureFetchCredit(fetchCredit);

  return {
    fetchCredit: /** @type {(uuid: string) => Promise<number | null>} */ (fetchCredit),
    resolveUuid: resolveUuidDependency(getUuid),
    errorLogger: resolveErrorLogger(logError),
  };
}

/**
 * Ensure a fetchCredit dependency is provided.
 * @param {unknown} fetchCredit Candidate dependency.
 * @returns {void}
 */
function ensureFetchCredit(fetchCredit) {
  if (typeof fetchCredit !== 'function') {
    throw new TypeError('fetchCredit must be a function');
  }
}

/**
 * Use a custom UUID resolver or default to the internal extractor.
 * @param {((request: unknown) => string) | undefined} getUuid Optional resolver.
 * @returns {(request: unknown) => string} UUID resolver to run.
 */
function resolveUuidDependency(getUuid) {
  if (typeof getUuid === 'function') {
    return getUuid;
  }

  return (request) => {
    if (request && typeof request === 'object') {
      return extractUuid(/** @type {{ path?: string, params?: Record<string, unknown>, query?: Record<string, unknown> }} */ (request));
    }
    return extractUuid(request);
  };
}

/**
 * Select a logger for handler errors.
 * @param {((error: unknown) => void) | undefined} logError Optional logger.
 * @returns {(error: unknown) => void} Logger that safely ignores errors.
 */
function resolveErrorLogger(logError) {
  return (/** @type {(error: unknown) => void} */ (functionOrFallback(logError, () => () => {})));
}

/**
 * Normalize the HTTP method before validation.
 * @param {unknown} method Candidate HTTP method.
 * @returns {string} Method string when valid, otherwise an empty string.
 */
function deriveRequestMethod(method) {
  return stringOrDefault(method, '');
}

/**
 * Validate that the method is allowed.
 * @param {string} method Normalized HTTP method.
 * @returns {{ status: number, body: string, headers?: Record<string, string> } | null} Error response when invalid.
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
 * Validate the request payload.
 * @param {string} method Normalized HTTP method.
 * @param {string} uuid Extracted UUID string.
 * @returns {{ status: number, body: string, headers?: Record<string, string> } | null} Validation error metadata.
 */
function resolveRequestValidationError(method, uuid) {
  const methodError = resolveMethodError(method);
  if (methodError) {
    return methodError;
  }

  return resolveUuidPresence(uuid);
}

/**
 * Build the response after validation.
 * @param {{ status: number, body: string, headers?: Record<string, string> } | null} validationError Validation result.
 * @param {() => Promise<{
 *   status: number,
 *   body: string | { credit: number },
 *   headers?: Record<string, string>,
 * }>} onSuccess Success callback returning HTTP metadata.
 * @returns {Promise<{ status: number, body: string | { credit: number }, headers?: Record<string, string> }>} HTTP response information.
 */
async function resolveRequestResponse(validationError, onSuccess) {
  if (validationError) {
    return validationError;
  }

  return onSuccess();
}

/**
 * Ensure a UUID string exists and return an error when missing.
 * @param {string} uuid UUID extracted from the request.
 * @returns {{ status: number, body: string } | null} Missing UUID error when absent.
 */
function resolveUuidPresence(uuid) {
  if (!uuid) {
    return missingUuidResponse();
  }

  return null;
}

/**
 * Build the standard missing UUID response.
 * @returns {{ status: number, body: string }} HTTP error metadata.
 */
function missingUuidResponse() {
  return {
    status: 400,
    body: 'Missing UUID',
  };
}

/**
 * Fetch credit for a UUID and translate it into a JSON payload.
 * @param {(uuid: string) => Promise<number | null>} fetchCredit Function to fetch credit totals.
 * @param {string} uuid UUID used for the lookup.
 * @param {(error: unknown) => void} errorLogger Logger invoked when fetch attempts fail.
 * @returns {Promise<{ status: number, body: string | { credit: number } }>} HTTP response metadata.
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
 * Format the credit lookup result into an HTTP response.
 * @param {number | null} credit Credit total returned from Firestore.
 * @returns {{ status: number, body: string | { credit: number } }} Response metadata.
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
 * Produce a generic internal error response payload.
 * @returns {{ status: number, body: string }} HTTP error metadata.
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
 * Extract the credit number from a Firestore snapshot.
 * @param {import('@google-cloud/firestore').DocumentSnapshot} snap Snapshot containing credit data.
 * @returns {number | null} Stored credit total when present.
 */
function getCreditFromSnapshot(snap) {
  if (!snap.exists) {
    return null;
  }

  const data = resolveSnapshotData(snap);
  return resolveCreditValue(data);
}

/**
 * Safely read the Firestore snapshot payload when available.
 * @param {import('@google-cloud/firestore').DocumentSnapshot} snap Firestore snapshot to inspect.
 * @returns {Record<string, unknown> | undefined} Document data or undefined when unavailable.
 */
function resolveSnapshotData(snap) {
  if (typeof snap.data !== 'function') {
    return undefined;
  }

  return snap.data();
}

/**
 * Extract the numeric credit value from normalized data.
 * @param {Record<string, unknown> | undefined} data Data payload.
 * @returns {number} The stored credit when present, otherwise zero.
 */
function resolveCreditValue(data) {
  return getNumericValueOrZero(data, record => record.credit);
}
