import {
  assertFunction,
  ensureString,
  normalizeNonStringValue,
  stringOrNull,
} from './common-core.js';
export { DEFAULT_BUCKET_NAME } from './common-core.js';

/** @typedef {import('../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/** @typedef {{ code?: string, message?: unknown }} FirebaseError */
/** @typedef {(value: unknown) => boolean} BooleanPredicate */

export const MISSING_AUTHORIZATION_RESPONSE = {
  status: 401,
  body: 'Missing or invalid Authorization header',
};

export const NO_JOB_RESPONSE = { status: 404, body: 'No moderation job' };

/**
 * Ensure a candidate dependency is callable before using it.
 * @param {unknown} candidate Value being validated.
 * @param {string} name Name of the dependency for error reporting.
 * @returns {void}
 */
/**
 * Guard a request body check with a presence predicate.
 * @param {unknown} body Candidate request body.
 * @param {(value: unknown) => boolean} evaluator Evaluation to run when a body exists.
 * @returns {boolean} Result of the evaluator or false when no body is supplied.
 */
export function whenBodyPresent(body, evaluator) {
  if (!body) {
    return false;
  }

  return evaluator(body);
}

/**
 * Detect whether a Firestore snapshot exposes a callable data helper.
 * @param {{ data?: () => unknown } | null | undefined} snapshot Snapshot candidate.
 * @returns {snapshot is { data: () => unknown }} True when the snapshot exposes `data`.
 */
function hasSnapshotData(snapshot) {
  return Boolean(snapshot && typeof snapshot.data === 'function');
}

/**
 * Safely read the data payload from a Firestore snapshot.
 * @param {{ data?: () => unknown } | null | undefined} snapshot Snapshot candidate.
 * @returns {unknown | null} Snapshot data when available, otherwise null.
 */
export function getSnapshotData(snapshot) {
  if (!hasSnapshotData(snapshot)) {
    return null;
  }

  return snapshot.data();
}

/**
 * Determine whether a Firebase initialization error indicates a duplicate app.
 * @param {unknown} error Error thrown by `initializeApp`.
 * @returns {boolean} True when the error represents a duplicate app instance.
 */
export function isDuplicateAppError(error) {
  if (!error) {
    return false;
  }
  return hasDuplicateAppIdentifierMessage(/** @type {FirebaseError} */ (error));
}

/**
 * Render the readable error message when available.
 * @param {unknown} error Candidate error object.
 * @returns {string} Message string or empty string when unavailable.
 */
export function extractErrorMessage(error) {
  if (!hasStringMessage(error)) {
    return '';
  }

  return error.message;
}

/**
 * Detect whether the error includes a string `message`.
 * @param {unknown} error Candidate error object.
 * @returns {error is { message: string }} True when a message string is present.
 */
export function hasStringMessage(error) {
  if (!error) {
    return false;
  }
  return typeof (/** @type {FirebaseError} */ (error).message) === 'string';
}

/**
 * Determine whether the error carries the duplicate-app identifier and message.
 * @param {{ code?: string, message?: unknown }} error Firebase initialization error.
 * @returns {boolean} True when the error represents a duplicate app.
 */
function hasDuplicateAppIdentifierMessage(error) {
  if (!hasDuplicateIdentifier(error)) {
    return false;
  }

  return messageIndicatesDuplicate(error);
}

/**
 * Decide if the error payload identifies a duplicate Firebase app.
 * @param {{ code?: string, message?: unknown }} error Error details from initializeApp.
 * @returns {boolean} True when a duplicate app identifier is present.
 */
function hasDuplicateIdentifier(error) {
  return (
    error.code === 'app/duplicate-app' || typeof error.message === 'string'
  );
}

/**
 * Confirm the error message mentions an existing app.
 * @param {{ message?: unknown }} error Error details to inspect.
 * @returns {boolean} True when the message explicitly notes the app already exists.
 */
function messageIndicatesDuplicate(error) {
  if (typeof error.message !== 'string') {
    return false;
  }

  return String(error.message).toLowerCase().includes('already exists');
}

/**
 * Build a Playwright-specific origin list when provided.
 * @param {unknown} playwrightOrigin Candidate override origin.
 * @returns {string[]} Singleton array containing the origin when valid, otherwise empty.
 */
export function buildTestOrigins(playwrightOrigin) {
  const normalized = ensureString(playwrightOrigin);
  if (normalized) {
    return [normalized];
  }

  return [];
}

/**
 * Determine the allowed origins for an endpoint by reading the current runtime labels.
 * @param {Record<string, unknown> | null | undefined} environmentVariables Environment map exposed to the function.
 * @returns {string[]} Allowed origin list for the deployment environment.
 */
export function resolveAllowedOrigins(environmentVariables) {
  const environment = getEnvironmentVariable(
    environmentVariables,
    'DENDRITE_ENVIRONMENT'
  );
  const envType = classifyDeploymentEnvironment(environment);

  if (envType === 'test') {
    const playwrightOrigin = getEnvironmentVariable(
      environmentVariables,
      'PLAYWRIGHT_ORIGIN'
    );
    return buildTestOrigins(playwrightOrigin);
  }

  return productionOrigins;
}

/**
 * Safely read a runtime environment variable.
 * @param {Record<string, unknown> | null | undefined} environmentVariables Runtime environment map.
 * @param {string} key Variable name to retrieve.
 * @returns {unknown} Variable value when available or `undefined`.
 */
export function getEnvironmentVariable(environmentVariables, key) {
  if (!environmentVariables) {
    return undefined;
  }

  return environmentVariables[key];
}

const TEST_ENV_PREFIX = 't-';

const ENVIRONMENT_CLASSIFIERS = [
  { check: isProdEnvironmentLabel, value: 'prod' },
  { check: isTestEnvironmentLabel, value: 'test' },
];

/**
 * Classify a deployment label into a known environment type.
 * @param {unknown} environment Raw label read from the deployment configuration.
 * @returns {'prod' | 'test'} Normalized environment type.
 */
export function classifyDeploymentEnvironment(environment) {
  const classifier = ENVIRONMENT_CLASSIFIERS.find(({ check }) =>
    check(environment)
  );

  if (classifier) {
    return /** @type {'prod' | 'test'} */ (classifier.value);
  }

  throw new Error(
    `Unsupported environment label: ${formatEnvironmentLabel(environment)}`
  );
}

/**
 * Detect whether the environment label matches production.
 * @param {unknown} environment Candidate label.
 * @returns {boolean} True when the label is 'prod'.
 */
function isProdEnvironmentLabel(environment) {
  return environment === 'prod';
}

/**
 * Detect whether the label represents a Playwright test deployment.
 * @param {unknown} environment Candidate label.
 * @returns {boolean} True when the label starts with the test prefix.
 */
function isTestEnvironmentLabel(environment) {
  return (
    typeof environment === 'string' && environment.startsWith(TEST_ENV_PREFIX)
  );
}

/**
 * Format the environment label for diagnostics.
 * @param {unknown} environment Raw label.
 * @returns {string} Stringified label.
 */
function formatEnvironmentLabel(environment) {
  if (typeof environment === 'string') {
    return environment;
  }

  return 'unknown';
}

/**
 * Normalize an incoming HTTP method to uppercase.
 * @param {unknown} method Candidate HTTP method.
 * @returns {string} Uppercase verb or empty string when invalid.
 */
export function normalizeMethod(method) {
  if (typeof method !== 'string') {
    return '';
  }

  return method.toUpperCase();
}

/**
 * Determine whether the provided value is callable.
 * @param {unknown} value Candidate value.
 * @returns {value is Function} True when callable.
 */
export function isFunction(value) {
  return typeof value === 'function';
}

/**
 * Normalize a raw header value to a string when possible.
 * @param {unknown} value Header candidate.
 * @returns {string | null} Normalized header or null.
 */
export function normalizeHeaderValue(value) {
  return stringOrNull(value);
}

/**
 * Retrieve and normalize a header via the provided getter.
 * @param {Function} getter Header getter function.
 * @param {string} name Header key name.
 * @returns {string | null} Normalized header string or null.
 */
export function getHeaderFromGetter(getter, name) {
  if (!isFunction(getter)) {
    return null;
  }

  return normalizeHeaderValue(getter(name));
}

/**
 * Send a generic success payload for HTTP responders.
 * @param {NativeHttpResponse} res Express response object.
 * @returns {void}
 */
export function sendOkResponse(res) {
  res.status(200).json({ ok: true });
}

/**
 * Assert that the named dependencies are callable functions.
 * @param {Array<[string, unknown]>} candidates Tuple of dependency name and candidate function.
 * @returns {void}
 */
export function assertFunctionDependencies(candidates) {
  candidates.forEach(([name, candidate]) => {
    assertFunction(candidate, name);
  });
}

/**
 * Assert that the UUID and timestamp helpers are callable.
 * @param {{ randomUUID: unknown, getServerTimestamp: unknown }} deps Dependency candidates.
 * @returns {void}
 */
export function assertRandomUuidAndTimestamp(deps) {
  const { randomUUID, getServerTimestamp } = deps;
  assertFunction(randomUUID, 'randomUUID');
  assertFunction(getServerTimestamp, 'getServerTimestamp');
}

/**
 * Return a fallback when the provided message is falsy.
 * @param {string | undefined | null} message Candidate message.
 * @param {string} fallback Fallback value when message is falsy.
 * @returns {string} Message to surface to the caller.
 */
export function resolveMessageOrDefault(message, fallback) {
  if (message) {
    return message;
  }

  return fallback;
}

/**
 * Build a simple object containing the first error encountered.
 * @param {unknown} error Error payload to wrap.
 * @returns {{ error: unknown } | null} Wrapped error object or null when no error was provided.
 */
export function buildErrorResult(error) {
  if (error) {
    return { error };
  }

  return null;
}

/**
 * Return the first error result when present, otherwise delegate to the fallback.
 * @template T
 * @param {unknown} error Error payload.
 * @param {() => T} fallback Supplier invoked when no error was found.
 * @returns {{ error: unknown } | T} Error wrapper or fallback result.
 */
export function returnErrorResultOrValue(error, fallback) {
  const errorResult = buildErrorResult(error);
  if (errorResult) {
    return errorResult;
  }

  return fallback();
}

/**
 * Normalize a numeric lookup result, returning zero when the value or source is absent.
 * @param {Record<string, unknown> | undefined | null} data Data object providing the numeric value.
 * @param {(payload: Record<string, unknown>) => unknown} selector Selector that reads a property from the data.
 * @returns {number} Numeric value when available, otherwise zero.
 */
export function getNumericValueOrZero(data, selector) {
  if (!data) {
    return 0;
  }

  return resolveNumericCandidate(selector(data));
}
/**
 * Normalize a candidate into a number when possible; otherwise zero.
 * @param {unknown} value Candidate to inspect.
 * @returns {number} Number extracted from the value or zero.
 */
function resolveNumericCandidate(value) {
  if (typeof value === 'number') {
    return value;
  }

  return 0;
}

/**
 * Extract the first string element from an array candidate.
 * @param {unknown[]} candidate Array candidate.
 * @returns {string | null} String value or null.
 */
export function extractStringFromCandidateArray(candidate) {
  const [first] = candidate;

  if (typeof first === 'string') {
    return first;
  }

  return null;
}

/**
 * Normalize a non-string header candidate.
 * @param {unknown} candidate Candidate value.
 * @returns {string | null} Normalized string or null.
 */
export function normalizeNonStringCandidate(candidate) {
  if (Array.isArray(candidate)) {
    return extractStringFromCandidateArray(candidate);
  }

  return null;
}

/**
 * Normalize authorization candidate values.
 * @param {unknown} candidate Value returned for an Authorization header.
 * @returns {string | null} Normalized string or null.
 */
export function normalizeAuthorizationCandidate(candidate) {
  if (typeof candidate === 'string') {
    return candidate;
  }

  return normalizeNonStringCandidate(candidate);
}

/**
 * Try to retrieve an authorization header through the getter helper.
 * @param {(name: string) => string | string[] | undefined} getter Header getter.
 * @param {string} name Header key.
 * @returns {string | null} Header string or null.
 */
export function tryGetHeader(getter, name) {
  return normalizeAuthorizationCandidate(getter(name));
}

/**
 * Normalize a textual input into a trimmed string bounded by the provided length.
 * @param {unknown} value Raw value supplied by the client.
 * @param {number} maxLength Maximum number of characters allowed in the normalized result.
 * @returns {string} Normalized string respecting the requested length.
 */
export function normalizeString(value, maxLength) {
  let stringValue;
  if (typeof value !== 'string') {
    stringValue = normalizeNonStringValue(value);
  } else {
    stringValue = value;
  }

  return stringValue.trim().slice(0, maxLength);
}

/**
 * Normalize content input by coercing to string, harmonizing newlines, and enforcing a max length.
 * @param {unknown} value Candidate content value.
 * @param {number} maxLength Maximum number of characters to keep.
 * @returns {string} Normalized content string.
 */
export function normalizeContent(value, maxLength) {
  const normalized = String(value ?? '');
  return normalized.replace(/\r\n?/g, '\n').slice(0, maxLength);
}

/**
 * Normalize submission bodies by coercing to a string, normalizing newlines, and trimming to the allowed length.
 * @param {unknown} value Raw submission text.
 * @returns {string} Normalized submission body.
 */
export function normalizeSubmissionContent(value) {
  return normalizeContent(value, 10_000);
}

/**
 * Normalize an author field for storage.
 * @param {unknown} author Candidate author value.
 * @returns {string} Normalized author string.
 */
export function normalizeAuthor(author) {
  return normalizeString(author, 120);
}

/**
 * Normalize arbitrary text to the short string length used by form submissions.
 * @param {unknown} value Candidate value provided by the caller.
 * @returns {string} Normalized text trimmed to 120 characters.
 */
export function normalizeShortString(value) {
  return normalizeString(value, 120);
}

/**
 * Origins that are permitted to access production endpoints.
 * Centralizes the allow list so every Cloud Function can reference
 * the same deployment configuration.
 */
export const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

/**
 * Respond to an origin lookup using the supplied predicate.
 * @param {{
 *   origin: string | null | undefined,
 *   allowedOrigins: string[],
 *   isAllowedOriginFn: (origin: string | null | undefined, origins: string[]) => boolean,
 * }} config Inputs for the validation routine.
 * @param {(err: Error | null, allow?: boolean) => void} cb Callback invoked when the origin is validated.
 * @returns {void}
 */
function respondToCorsOrigin(
  { origin, allowedOrigins, isAllowedOriginFn },
  cb
) {
  if (isAllowedOriginFn(origin, allowedOrigins)) {
    cb(null, true);
    return;
  }

  cb(new Error('CORS'));
}

/**
 * Build a CORS origin handler from the provided predicate and whitelist.
 * @param {(origin: string | null | undefined, origins: string[]) => boolean} isAllowedOriginFn Predicate that validates origins.
 * @param {string[]} allowedOrigins Allowed origins for the endpoint.
 * @returns {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} CORS origin handler.
 */
export function createCorsOriginHandler(isAllowedOriginFn, allowedOrigins) {
  assertFunction(isAllowedOriginFn, 'isAllowedOrigin');

  return (origin, cb) => {
    respondToCorsOrigin(
      { origin: origin ?? null, allowedOrigins, isAllowedOriginFn },
      cb
    );
  };
}

/**
 * Determine whether an origin is permitted based on the provided whitelist.
 * @param {string | null | undefined} origin Request origin header.
 * @param {string[]} allowedOrigins Allowed origins whitelist.
 * @returns {boolean} True when the origin is allowed or no origin is supplied.
 */
export function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Compose a CORS configuration object for middleware initialization.
 * @param {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} handleCorsOrigin Origin handler built via `createCorsOriginHandler`.
 * @param {string[]} [methods] Allowed HTTP methods.
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }} CORS options for `cors`.
 */
export function createCorsOptions(handleCorsOrigin, methods = ['POST']) {
  assertFunction(handleCorsOrigin, 'handleCorsOrigin');

  return {
    origin: handleCorsOrigin,
    methods,
  };
}

/**
 * Build a normalized response tuple consumed by Cloud Functions.
 * @param {number} status HTTP status code to emit.
 * @param {string | Record<string, unknown>} body Response body payload.
 * @returns {{ status: number, body: string | Record<string, unknown> }} Response envelope.
 */
export function createResponse(status, body) {
  return { status, body };
}

/**
 * Extract the Authorization header from a request.
 * @param {NativeHttpRequest} req Incoming HTTP request.
 * @returns {string} Authorization header or an empty string.
 */
export function getAuthHeader(req) {
  return ensureString(resolveAuthorizationHeader(req));
}

/**
 * Safely resolve the Authorization header from the request getter.
 * @param {NativeHttpRequest} req HTTP request object.
 * @returns {unknown} Resolved header value or undefined when unavailable.
 */
function resolveAuthorizationHeader(req) {
  return callAuthorizationGetter(req?.get);
}

/**
 * Invoke the optional getter when available.
 * @param {unknown} getter Candidate `get` helper from Express.
 * @returns {unknown} Authorization header or undefined.
 */
function callAuthorizationGetter(getter) {
  if (typeof getter !== 'function') {
    return undefined;
  }

  return getter('Authorization');
}

/**
 * Parse a bearer token from an Authorization header.
 * @param {string} authHeader Authorization header string.
 * @returns {string[] | null} Matches capturing the bearer token.
 */
export function matchAuthHeader(authHeader) {
  return authHeader.match(/^Bearer (.+)$/);
}

const BEARER_HEADER_REGEX = /^Bearer (.+)$/;

/**
 * Extract the bare token string from a bearer Authorization header.
 * @param {string} header Authorization header string.
 * @returns {string | null} Token when the header matches, otherwise null.
 */
export function matchBearerToken(header) {
  const match = header.match(BEARER_HEADER_REGEX);
  if (match) {
    return match[1];
  }
  return null;
}

const defaultMissingTokenMessage = 'Missing token';

/**
 * Check if a value is a non-null object.
 * @param {unknown} value - Value to check.
 * @returns {boolean} True when value is an object.
 */
function isObject(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Check if an object has a message property.
 * @param {unknown} obj - Object to check.
 * @returns {boolean} True when message property exists.
 */
function hasMessageProperty(obj) {
  if (!isObject(obj)) {
    return false;
  }
  return 'message' in obj;
}

/**
 * Build a human-friendly invalid token message.
 * @param {unknown} error Validation error.
 * @returns {string} Message sent to clients when token validation fails.
 */
function defaultInvalidTokenMessage(error) {
  if (!hasMessageProperty(error)) return 'Invalid token';
  const messageStr = extractErrorMessage(error);
  return messageStr || 'Invalid token';
}

/**
 * Extract the bearer token string from the request.
 * @param {NativeHttpRequest} req Incoming HTTP request.
 * @returns {string} Bearer token string or an empty string when missing.
 */
function extractTokenFromRequest(req) {
  const authHeader = getAuthHeader(req);
  return getBearerTokenFromMatch(matchAuthHeader(authHeader));
}

/**
 * Pull the bearer token out of the regex match info if it exists.
 * @param {string[] | null} match Result of `matchAuthHeader`.
 * @returns {string} Extracted bearer token or empty string when absent.
 */
function getBearerTokenFromMatch(match) {
  if (!match) {
    return '';
  }
  return match[1];
}

/**
 * Ensure the provided token belongs to an administrator and report errors.
 * @param {{
 *   token: string,
 *   verifyToken: (token: string) => Promise<import('firebase-admin/auth').DecodedIdToken>,
 *   isAdminUid: (decoded: import('firebase-admin/auth').DecodedIdToken) => boolean,
 *   sendUnauthorized: (res: NativeHttpResponse, message: string) => void,
 *   sendForbidden: (res: NativeHttpResponse) => void,
 *   res: NativeHttpResponse,
 * }} deps Dependencies for validating the token and sending HTTP errors.
 * @returns {Promise<boolean>} True when the token is authorized for an admin request.
 */
async function authorizeAdminToken({
  token,
  verifyToken,
  isAdminUid,
  sendUnauthorized,
  sendForbidden,
  res,
}) {
  try {
    const decoded = await verifyToken(token);
    return ensureAdminIdentity({
      decoded,
      isAdminUid,
      sendForbidden,
      res,
    });
  } catch (error) {
    const message = defaultInvalidTokenMessage(error);
    sendUnauthorized(res, message);
    return false;
  }
}

/**
 * Confirm the decoded token belongs to an admin and respond when it does not.
 * @param {{
 *   decoded: import('firebase-admin/auth').DecodedIdToken,
 *   isAdminUid: (decoded: import('firebase-admin/auth').DecodedIdToken) => boolean,
 *   sendForbidden: (res: NativeHttpResponse) => void,
 *   res: NativeHttpResponse,
 * }} deps Authorization helpers.
 * @returns {boolean} True when the decoded token matches the admin UID.
 */
function ensureAdminIdentity({ decoded, isAdminUid, sendForbidden, res }) {
  const isAdmin = Boolean(isAdminUid(decoded));
  if (!isAdmin) {
    sendForbidden(res);
    return false;
  }
  return true;
}

/**
 * Create a reusable admin guard.
 * @param {object} deps Authorization collaborators.
 * @param {(token: string) => Promise<import('firebase-admin/auth').DecodedIdToken>} deps.verifyToken Token validator.
 * @param {(decoded: import('firebase-admin/auth').DecodedIdToken) => boolean} deps.isAdminUid Admin UID checker.
 * @param {(res: NativeHttpResponse, message: string) => void} deps.sendUnauthorized Sends 401 responses.
 * @param {(res: NativeHttpResponse) => void} deps.sendForbidden Sends 403 responses.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} Express middleware that authenticates the admin request and reports success.
 */
export function createVerifyAdmin({
  verifyToken,
  isAdminUid,
  sendUnauthorized,
  sendForbidden,
}) {
  return async function verifyAdmin(req, res) {
    const token = extractTokenFromRequest(req);
    if (!token) {
      sendUnauthorized(res, defaultMissingTokenMessage);
      return false;
    }

    return authorizeAdminToken({
      token,
      verifyToken,
      isAdminUid,
      sendUnauthorized,
      sendForbidden,
      res,
    });
  };
}
