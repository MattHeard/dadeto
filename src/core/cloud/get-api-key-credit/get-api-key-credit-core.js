import { createDb } from './create-db.js';
import { assertFunction, isValidString } from './common-core.js';
import { validatePostMethod } from '../http-method-guard.js';

const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'Method Not Allowed' };
const MISSING_UUID_RESPONSE = { status: 400, body: 'Missing UUID' };
const INTERNAL_ERROR_RESPONSE = { status: 500, body: 'Internal error' };
const NOT_FOUND_RESPONSE = { status: 404, body: 'Not found' };

const CREDIT_RESPONSE_BY_VALUE = new Map([
  [null, NOT_FOUND_RESPONSE],
  [undefined, INTERNAL_ERROR_RESPONSE],
]);

/**
 * Determine whether a Firestore document snapshot is missing.
 * @param {{ exists?: boolean }} doc Snapshot to inspect for existence.
 * @returns {boolean} True when the document is absent.
 */
export function isMissingDocument(doc) {
  return !doc?.exists;
}

/**
 * Fetch the Firestore document containing API key credit information.
 * @param {import('@google-cloud/firestore').Firestore} firestoreInstance Firestore client used for queries.
 * @param {string | number} uuid Identifier for the API key credit document.
 * @returns {Promise<import('@google-cloud/firestore').DocumentSnapshot>} The matching Firestore document snapshot.
 */
export function fetchApiKeyCreditDocument(firestoreInstance, uuid) {
  return firestoreInstance.collection('api-key-credit').doc(String(uuid)).get();
}

/**
 * Instantiate a Firestore client using the supplied constructor.
 * @param {typeof import('@google-cloud/firestore').Firestore} FirestoreConstructor Firestore constructor.
 * @returns {import('@google-cloud/firestore').Firestore} Initialized Firestore client.
 */
export function createFirestore(FirestoreConstructor) {
  assertFunction(FirestoreConstructor, 'FirestoreConstructor');

  return createDb(FirestoreConstructor);
}

/**
 * Check if a UUID is a valid string.
 * @param {unknown} uuid Candidate UUID.
 * @returns {boolean} True if UUID is valid string.
 */
function isValidUuid(uuid) {
  return typeof uuid === 'string' && isValidString(uuid);
}

/**
 * Resolve the UUID from the request or dependency helper.
 * @param {Record<string, unknown>} request - Incoming request object.
 * @param {(request: unknown) => string | undefined} getUuid - Helper to derive the UUID.
 * @returns {string | undefined} UUID value when available.
 */
function resolveUuid(request, getUuid) {
  const directUuid = request.uuid;
  if (isValidUuid(directUuid)) {
    return /** @type {string} */ (directUuid);
  }
  return getUuid(request);
}

/**
 * Check if credit value is special (null or undefined).
 * @param {number | null | undefined} credit - Credit value to check.
 * @returns {boolean} True if special value.
 */
function isSpecialCreditValue(credit) {
  return credit === null || credit === undefined;
}

/**
 * Resolve special response for non-numeric credit values.
 * @param {unknown} credit - Credit value to lookup.
 * @returns {{ status: number, body: unknown } | undefined} Special response or undefined.
 */
function resolveSpecialCreditMapping(credit) {
  if (typeof credit === 'number') {
    return undefined;
  }
  return CREDIT_RESPONSE_BY_VALUE.get(/** @type {null | undefined} */ (credit));
}

/**
 * Get response for special credit values.
 * @param {number | null | undefined} credit - Credit value.
 * @returns {{ status: number, body: unknown }} Special response or default.
 */
function getSpecialCreditResponse(credit) {
  const special = resolveSpecialCreditMapping(credit);
  if (special) {
    return special;
  }
  return { status: 200, body: { credit } };
}

/**
 * Map a credit value to the appropriate HTTP response.
 * @param {number | null | undefined} credit - Credit value fetched from storage.
 * @returns {{ status: number, body: unknown }} HTTP response describing the outcome.
 */
function mapCreditToResponse(credit) {
  if (isSpecialCreditValue(credit)) {
    return getSpecialCreditResponse(credit);
  }
  return { status: 200, body: { credit } };
}

export const getApiKeyCreditTestUtils = {
  isSpecialCreditValue,
  getSpecialCreditResponse,
  mapCreditToResponse,
};

/**
 * Fetch credit details and return the mapped response.
 * @param {(uuid: string) => Promise<number | null | undefined>} fetchCredit - Dependency used to retrieve credit.
 * @param {string} uuid - UUID to look up.
 * @returns {Promise<{ status: number, body: unknown }>} Resolved response.
 */
async function fetchCreditResponse(fetchCredit, uuid) {
  try {
    const credit = await fetchCredit(uuid);
    return mapCreditToResponse(credit);
  } catch {
    return INTERNAL_ERROR_RESPONSE;
  }
}

/**
 * Derive an error response when the UUID is missing.
 * @param {string | undefined} uuid - UUID candidate to check.
 * @returns {{ status: number, body: string } | null} Response when missing, otherwise null.
 */
function getMissingUuidResponse(uuid) {
  if (isValidUuid(uuid)) {
    return null;
  }
  return MISSING_UUID_RESPONSE;
}

/**
 * Fetch credit only when the UUID is present, otherwise return an error response.
 * @param {(uuid: string) => Promise<number | null | undefined>} fetchCredit - Dependency used to retrieve credit.
 * @param {Record<string, unknown>} request - Incoming request object.
 * @param {(request: unknown) => string | undefined} getUuid - Helper to derive the UUID.
 * @returns {Promise<{ status: number, body: unknown }>} Resolved response.
 */
async function fetchCreditWhenUuidPresent(fetchCredit, request, getUuid) {
  const uuid = resolveUuid(request, getUuid);
  const missingUuidResponse = getMissingUuidResponse(uuid);

  if (missingUuidResponse) {
    return missingUuidResponse;
  }

  // At this point, uuid is guaranteed to be a non-empty string (getMissingUuidResponse returned null)
  return fetchCreditResponse(fetchCredit, /** @type {string} */ (uuid));
}

/**
 * Execute the request lifecycle with method and UUID validation.
 * @param {(uuid: string) => Promise<number | null | undefined>} fetchCredit - Dependency used to retrieve credit.
 * @param {(request: unknown) => string | undefined} getUuid - Helper to derive the UUID.
 * @param {Record<string, unknown>} request - Incoming request object.
 * @returns {Promise<{ status: number, body: unknown }>} Resolved response.
 */
async function executeRequest(fetchCredit, getUuid, request) {
  const methodValidation = validatePostMethod(
    request.method,
    METHOD_NOT_ALLOWED_RESPONSE,
    { treatNonStringAsPost: true }
  );
  if (methodValidation) {
    return methodValidation;
  }

  return fetchCreditWhenUuidPresent(fetchCredit, request, getUuid);
}

/**
 * Build a handler that retrieves credit information for an API key.
 * @param {{
 *   fetchCredit: (uuid: string) => Promise<number | null | undefined>,
 *   getUuid: (request: unknown) => string | undefined,
 * }} dependencies Required dependencies for the handler.
 * @returns {(request: Record<string, unknown>) => Promise<{ status: number, body: unknown }>} Handler function.
 */
export function createGetApiKeyCreditHandler({ fetchCredit, getUuid }) {
  assertFunction(fetchCredit, 'fetchCredit');
  assertFunction(getUuid, 'getUuid');

  return async function handleRequest(request = {}) {
    return executeRequest(fetchCredit, getUuid, request);
  };
}
