import { createDb } from '../get-api-key-credit-v2/create-db.js';
import { isValidString } from '../../validation.js';

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
 * Ensure a dependency is a function before using it.
 * @param {string} name - Name of the dependency for error messaging.
 * @param {*} dependency - Candidate dependency to validate.
 */
function assertFunctionDependency(name, dependency) {
  if (typeof dependency !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Instantiate a Firestore client using the supplied constructor.
 * @param {typeof import('@google-cloud/firestore').Firestore} FirestoreConstructor Firestore constructor.
 * @returns {import('@google-cloud/firestore').Firestore} Initialized Firestore client.
 */
export function createFirestore(FirestoreConstructor) {
  assertFunctionDependency('FirestoreConstructor', FirestoreConstructor);

  return createDb(FirestoreConstructor);
}

/**
 * Normalize a request method for validation.
 * @param {*} method - Method value taken from the request.
 * @returns {string} Uppercase representation or the default POST method.
 */
function normalizeMethod(method) {
  if (typeof method !== 'string') {
    return 'POST';
  }
  return method.toUpperCase();
}

/**
 * Validate that the incoming method is POST.
 * @param {*} method - Method value taken from the request.
 * @returns {{ status: number, body: string } | null} Error response when invalid, otherwise null.
 */
function validateMethod(method) {
  if (normalizeMethod(method) === 'POST') {
    return null;
  }
  return METHOD_NOT_ALLOWED_RESPONSE;
}

/**
 * Resolve the UUID from the request or dependency helper.
 * @param {Record<string, unknown>} request - Incoming request object.
 * @param {(request: unknown) => string | undefined} getUuid - Helper to derive the UUID.
 * @returns {string | undefined} UUID value when available.
 */
function resolveUuid(request, getUuid) {
  const directUuid = request.uuid;
  if (isValidString(directUuid)) {
    return directUuid;
  }
  return getUuid(request);
}

/**
 * Map a credit value to the appropriate HTTP response.
 * @param {number | null | undefined} credit - Credit value fetched from storage.
 * @returns {{ status: number, body: unknown }} HTTP response describing the outcome.
 */
function mapCreditToResponse(credit) {
  return (
    CREDIT_RESPONSE_BY_VALUE.get(credit) ?? { status: 200, body: { credit } }
  );
}

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
  if (isValidString(uuid)) {
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

  return fetchCreditResponse(fetchCredit, uuid);
}

/**
 * Execute the request lifecycle with method and UUID validation.
 * @param {(uuid: string) => Promise<number | null | undefined>} fetchCredit - Dependency used to retrieve credit.
 * @param {(request: unknown) => string | undefined} getUuid - Helper to derive the UUID.
 * @param {Record<string, unknown>} request - Incoming request object.
 * @returns {Promise<{ status: number, body: unknown }>} Resolved response.
 */
async function executeRequest(fetchCredit, getUuid, request) {
  const methodValidation = validateMethod(request.method);
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
  assertFunctionDependency('fetchCredit', fetchCredit);
  assertFunctionDependency('getUuid', getUuid);

  return async function handleRequest(request = {}) {
    return executeRequest(fetchCredit, getUuid, request);
  };
}
