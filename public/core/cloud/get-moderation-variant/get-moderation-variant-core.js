import {
  normalizeString,
  productionOrigins,
  createCorsOriginHandler,
  createCorsOptions as buildCorsOptions,
  classifyDeploymentEnvironment,
  buildTestOrigins,
} from './cloud-core.js';
import { isAllowedOrigin as coreIsAllowedOrigin } from './cors.js';

export { productionOrigins, coreIsAllowedOrigin as isAllowedOrigin };
export { createCorsOriginHandler as createHandleCorsOrigin };

/**
 * @typedef {object} FirestoreDocumentSnapshot
 * @property {boolean} exists Indicates whether the document exists.
 * @property {() => Record<string, unknown> | undefined} data Retrieves the document data.
 * @property {{ parent?: FirestoreDocumentReference } | null | undefined} [ref] Optional reference metadata.
 */

/**
 * @typedef {object} FirestoreQuerySnapshot
 * @property {FirestoreDocumentSnapshot[]} docs Document snapshots returned by a collection query.
 */

/**
 * @typedef {object} FirestoreCollectionReference
 * @property {(id: string) => FirestoreDocumentReference} doc Resolves a document reference by id.
 * @property {() => Promise<FirestoreQuerySnapshot>} get Reads all documents within the collection.
 */

/**
 * @typedef {object} FirestoreDocumentReference
 * @property {() => Promise<FirestoreDocumentSnapshot>} get Reads the referenced document snapshot.
 * @property {(name: string) => FirestoreCollectionReference} collection Resolves a nested collection.
 * @property {{ parent?: FirestoreDocumentReference } | null | undefined} [parent] Parent reference metadata.
 */

/**
 * @typedef {object} FirestoreLike
 * @property {(name: string) => FirestoreCollectionReference} collection Provides access to Firestore collections.
 */

/**
 * @typedef {object} AuthLike
 * @property {(token: string) => Promise<{ uid?: string | null | undefined }>} verifyIdToken Verifies an ID token and resolves the decoded payload.
 */

/**
 * @typedef {object} RequestHeaders
 * @property {string | string[] | undefined} [authorization] Lowercase authorization header.
 * @property {string | string[] | undefined} [Authorization] Canonical Authorization header.
 */

/**
 * @typedef {object} RequestLike
 * @property {(name: string) => string | null | undefined} [get] Optional getter for header values.
 * @property {RequestHeaders | undefined} [headers] Optional raw header map.
 */

/**
 * @typedef {object} VariantSnapshot
 * @property {FirestoreDocumentSnapshot} variantSnap Variant document snapshot.
 * @property {FirestoreDocumentReference} variantRef Variant document reference.
 */

/**
 * @typedef {object} VariantOption
 * @property {string} content Normalized option content.
 * @property {number} [targetPageNumber] Optional destination page number.
 */

/**
 * @typedef {object} VariantPayload
 * @property {string} title Story title for the moderation variant.
 * @property {string} content Variant body content.
 * @property {string} author Variant author display name.
 * @property {VariantOption[]} options Available moderation options for the variant.
 */

/**
 * @typedef {{ status: number, body: VariantPayload | string }} ResponderResult
 */

/**
 * @callback CorsCallback
 * @param {Error | null} err Error describing why the origin was rejected.
 * @param {boolean} [allow] Indicates whether the origin is permitted.
 * @returns {void}
 */

/**
 * @callback HandleCorsOrigin
 * @param {string | undefined} origin Origin reported by the request.
 * @param {CorsCallback} callback Node-style callback invoked with the validation result.
 * @returns {void}
 */

const MISSING_AUTHORIZATION_RESPONSE = {
  status: 401,
  body: 'Missing or invalid Authorization header',
};

const INVALID_TOKEN_RESPONSE = {
  status: 401,
  body: 'Invalid or expired token',
};

const NO_JOB_RESPONSE = { status: 404, body: 'No moderation job' };
const VARIANT_NOT_FOUND_RESPONSE = { status: 404, body: 'Variant not found' };

/**
 * Ensures the Firestore dependency exposes the collection API required by the responder.
 * @param {FirestoreLike | null | undefined} db Firestore dependency to validate.
 * @returns {void}
 * @throws {TypeError} When the dependency is missing the expected API surface.
 */
function assertFirestoreInstance(db) {
  if (!isFirestoreInstance(db)) {
    throw new TypeError('db must provide a collection method');
  }
}
/**
 * Validates that the authentication dependency supports verifying ID tokens.
 * @param {AuthLike | null | undefined} auth Authentication dependency to validate.
 * @returns {void}
 * @throws {TypeError} When the dependency is missing the verifyIdToken method.
 */
function assertAuthInstance(auth) {
  if (!isAuthInstance(auth)) {
    throw new TypeError('auth.verifyIdToken must be a function');
  }
}

/**
 * Determine whether the Firestore dependency exposes the expected collection API.
 * @param {FirestoreLike | null | undefined} db Dependency to validate.
 * @returns {boolean} True when the dependency offers a collection method.
 */
function isFirestoreInstance(db) {
  if (!db) {
    return false;
  }

  return typeof db.collection === 'function';
}

/**
 * Determine whether the auth dependency can verify ID tokens.
 * @param {AuthLike | null | undefined} auth Authentication helper under inspection.
 * @returns {boolean} True when verifyIdToken is a function.
 */
function isAuthInstance(auth) {
  if (!auth) {
    return false;
  }

  return typeof auth.verifyIdToken === 'function';
}

/**
 * Extracts a bearer token from an Authorization header value.
 * @param {string | null | undefined} authHeader Authorization header value to parse.
 * @returns {string | null} Extracted bearer token or null when the header is invalid.
 */
function parseAuthorizationHeader(authHeader) {
  if (typeof authHeader !== 'string') {
    return null;
  }

  return extractBearerToken(authHeader);
}

/**
 * Extracts the bearer token value from a header string already known to be a string.
 * @param {string} value Authorization header value.
 * @returns {string | null} Token when the header matches the Bearer pattern.
 */
function extractBearerToken(value) {
  const match = value.match(/^Bearer (.+)$/);
  if (match) {
    return match[1];
  }

  return null;
}
/**
 * Reads the Authorization header from an Express-style request object.
 * @param {RequestLike | null | undefined} request Incoming HTTP request.
 * @returns {string | null} Authorization header string when provided, otherwise null.
 */
function getAuthorizationHeader(request) {
  const headerKeys = ['Authorization', 'authorization'];
  return headerKeys
    .map(key => request.get(key))
    .find(value => typeof value === 'string');
}

/**
 * Extracts the bearer token from a request-like object.
 * @param {RequestLike} request Incoming HTTP request object.
 * @returns {string} Bearer token string or an empty string when missing.
 */
function resolveTokenFromRequest(request) {
  const authHeader = getAuthorizationHeader(request);
  return parseAuthorizationHeader(authHeader) || '';
}
/**
 * Resolves the variant assigned to the authenticated moderator.
 * @param {FirestoreLike} db Firestore dependency used to read moderator data.
 * @param {string} uid Authenticated moderator identifier.
 * @returns {Promise<VariantSnapshot | ResponderResult | null>} Snapshot information or an error response.
 */
async function fetchVariantSnapshot(db, uid) {
  const moderatorSnap = await db.collection('moderators').doc(uid).get();
  const variantRef = resolveModeratorVariantRef(moderatorSnap);

  if (!variantRef) {
    return null;
  }

  return fetchVariantResponse(variantRef);
}

/**
 * Determine the variant reference linked to a moderator document.
 * @param {FirestoreDocumentSnapshot} moderatorSnap Moderator document snapshot.
 * @returns {FirestoreDocumentReference | null} Variant reference or null when not assigned.
 */
function resolveModeratorVariantRef(moderatorSnap) {
  if (isModeratorSnapMissing(moderatorSnap)) {
    return null;
  }

  return extractVariantReference(moderatorSnap.data());
}

/**
 * Determine whether the moderator snapshot is missing or unassigned.
 * @param {FirestoreDocumentSnapshot | null | undefined} moderatorSnap Snapshot to inspect.
 * @returns {boolean} True when the moderator document is unavailable.
 */
function isModeratorSnapMissing(moderatorSnap) {
  if (!moderatorSnap) {
    return true;
  }

  return !moderatorSnap.exists;
}

/**
 * Extract the variant reference stored on the moderator document.
 * @param {Record<string, unknown> | null | undefined} moderatorData Moderator document data.
 * @returns {FirestoreDocumentReference | null} Assigned variant reference or null.
 */
function extractVariantReference(moderatorData) {
  if (!moderatorData) {
    return null;
  }

  return resolveVariantFromData(moderatorData.variant);
}

/**
 * Derive the stored variant reference from a raw field value.
 * @param {FirestoreDocumentReference | null | undefined} variant Raw variant field.
 * @returns {FirestoreDocumentReference | null} Valid reference or null.
 */
function resolveVariantFromData(variant) {
  if (variant !== undefined) {
    return variant;
  }

  return null;
}

/**
 * Resolve a variant response payload from the variant reference.
 * @param {FirestoreDocumentReference} variantRef Variant reference.
 * @returns {Promise<VariantSnapshot | ResponderResult>} Variant snapshot or error response.
 */
async function fetchVariantResponse(variantRef) {
  const variantSnap = await variantRef.get();
  if (variantSnap.exists) {
    return { variantSnap, variantRef };
  }

  return VARIANT_NOT_FOUND_RESPONSE;
}
/**
 * Fetches the story title that owns the provided variant reference.
 * @param {FirestoreDocumentReference} variantRef Variant document reference.
 * @returns {Promise<string>} Story title string.
 */
async function fetchStoryTitle(variantRef) {
  const pageRef = variantRef.parent.parent;
  const storyRef = pageRef.parent.parent;
  const storySnap = await storyRef.get();
  const storyData = storySnap.data();

  return normalizeString(storyData.title);
}
/**
 * Maps a Firestore option document into a serializable payload.
 * @param {FirestoreDocumentSnapshot} doc Firestore snapshot describing an option.
 * @returns {VariantOption} Normalized option payload.
 */
function mapOptionDoc(doc) {
  const data = doc.data() ?? {};
  const content = normalizeString(data.content);
  const { targetPageNumber } = data;

  return buildVariantOptionPayload(content, targetPageNumber);
}

/**
 * Build a variant option payload, including the target page when supplied.
 * @param {string} content Normalized option content.
 * @param {number | undefined} targetPageNumber Optional target page indicator.
 * @returns {VariantOption} Normalized option payload.
 */
function buildVariantOptionPayload(content, targetPageNumber) {
  if (targetPageNumber !== undefined) {
    return {
      content,
      targetPageNumber,
    };
  }

  return { content };
}
/**
 * Loads and normalizes the options belonging to a variant.
 * @param {FirestoreDocumentReference} variantRef Variant document reference.
 * @returns {Promise<VariantOption[]>} Normalized option list for the variant.
 */
function buildOptions(variantRef) {
  return variantRef
    .collection('options')
    .get()
    .then(snapshot => snapshot.docs.map(mapOptionDoc));
}
/**
 * Determines the allowed origins for the moderation variant endpoint.
 * @param {Record<string, string | undefined> | undefined} environmentVariables Environment variable map available to the function.
 * @returns {string[]} List of allowed origins.
 */
export function getAllowedOrigins(environmentVariables) {
  return resolveOriginsForEnvironmentType(
    classifyEnvironmentType(getEnvironmentTag(environmentVariables)),
    getPlaywrightOrigin(environmentVariables)
  );
}

/**
 * Read the environment tag from the runtime variables.
 * @param {Record<string, string | undefined> | undefined} environmentVariables Runtime environment map.
 * @returns {string | undefined} Environment tag extracted from the runtime.
 */
function getEnvironmentTag(environmentVariables) {
  return getEnvironmentVariable(environmentVariables, 'DENDRITE_ENVIRONMENT');
}

/**
 * Read the optional Playwright origin override from the runtime variables.
 * @param {Record<string, string | undefined> | undefined} environmentVariables Runtime environment map.
 * @returns {string | undefined} Playwright override origin.
 */
function getPlaywrightOrigin(environmentVariables) {
  return getEnvironmentVariable(environmentVariables, 'PLAYWRIGHT_ORIGIN');
}

/**
 * Safely read a runtime environment variable.
 * @param {Record<string, string | undefined> | undefined} environmentVariables Runtime map.
 * @param {string} key Environment variable key.
 * @returns {string | undefined} Requested value or `undefined`.
 */
function getEnvironmentVariable(environmentVariables, key) {
  if (!environmentVariables) {
    return undefined;
  }

  return environmentVariables[key];
}

/**
 * Select the allowed origins based on the deployment environment.
 * @param {'test' | 'prod'} environmentType Resolved environment classification.
 * @param {string | undefined} playwrightOrigin Optional Playwright-origin override.
 * @returns {string[]} Approved origins for the current environment.
 */
function resolveOriginsForEnvironmentType(environmentType, playwrightOrigin) {
  if (environmentType === 'test') {
    return buildTestOrigins(playwrightOrigin);
  }

  return productionOrigins;
}

/**
 * Classify the environment tag into a known environment type.
 * @param {string | undefined} environment Environment string read from the runtime.
 * @returns {'test' | 'prod'} Normalized environment type used for routing decisions.
 */
function classifyEnvironmentType(environment) {
  if (classifyDeploymentEnvironment(environment) === 'test') {
    return 'test';
  }

  return 'prod';
}

/**
 *
 * @param handleCorsOrigin
 */
/**
 * Build a GET-only CORS configuration for this endpoint.
 * @param {HandleCorsOrigin} handleCorsOrigin Origin validator returned by `createHandleCorsOrigin`.
 * @returns {{ origin: HandleCorsOrigin, methods: string[] }} CORS options.
 */
export function createCorsOptions(handleCorsOrigin) {
  return buildCorsOptions(handleCorsOrigin, ['GET']);
}

/**
 * Factory that builds the HTTP responder for the get-moderation-variant endpoint.
 * @param {{ db: FirestoreLike, auth: AuthLike }} deps External dependencies required by the responder.
 * @returns {(request: RequestLike) => Promise<ResponderResult>} Responder that resolves the HTTP response payload.
 */
export function createGetModerationVariantResponder({ db, auth }) {
  assertFirestoreInstance(db);
  assertAuthInstance(auth);

  return async function respond(request) {
    const token = resolveTokenFromRequest(request);

    if (!token) {
      return MISSING_AUTHORIZATION_RESPONSE;
    }

    return handleAuthorizedRequest({ db, auth, token });
  };
}

/**
 * Resolve and respond to an authenticated request.
 * @param {{
 *   db: FirestoreLike,
 *   auth: AuthLike,
 *   token: string,
 * }} params Authenticated request dependencies.
 * @returns {Promise<ResponderResult>} Response payload for the authorized request.
 */
async function handleAuthorizedRequest({ db, auth, token }) {
  const uidResult = await resolveUidFromToken(auth, token);
  const invalidResponse = getInvalidTokenResponseFromResult(uidResult);

  if (invalidResponse) {
    return invalidResponse;
  }

  return buildVariantResponse({ db, uid: uidResult.uid });
}

/**
 * Return an invalid token response when verification fails.
 * @param {{ uid: string | null | undefined, error: unknown }} uidResult Result from token verification.
 * @returns {ResponderResult | null} Response to send or null when the token is valid.
 */
function getInvalidTokenResponseFromResult(uidResult) {
  const errorResponse = getErrorResponse(uidResult.error);
  if (errorResponse) {
    return errorResponse;
  }

  return getMissingUidResponse(uidResult.uid);
}

/**
 * Build an invalid token response when an error is present.
 * @param {unknown} error Error raised by the verification process.
 * @returns {ResponderResult | null} Response to send when an error exists.
 */
function getErrorResponse(error) {
  if (error) {
    return createInvalidTokenResponse(error);
  }

  return null;
}

/**
 * Build an invalid token response when the UID is missing.
 * @param {string | null | undefined} uid UID decoded from the token.
 * @returns {ResponderResult | null} Response to send when the UID is absent.
 */
function getMissingUidResponse(uid) {
  if (!uid) {
    return createInvalidTokenResponse(null);
  }

  return null;
}

/**
 * Verify the ID token and return the decoded UID.
 * @param {AuthLike} auth Firebase auth helper.
 * @param {string} token ID token string.
 * @returns {Promise<{ uid: string | undefined | null, error: unknown }>} UID result and any verification error.
 */
function resolveUidFromToken(auth, token) {
  return auth
    .verifyIdToken(token)
    .then(buildDecodedUidResult)
    .catch(buildUidErrorResult);
}

/**
 * Build the UID result when token verification succeeds.
 * @param {{ uid?: string | null }} decoded Decoded token payload.
 * @returns {{ uid: string | null, error: null }} Normalized UID result.
 */
function buildDecodedUidResult(decoded) {
  return { uid: getDecodedUidValue(decoded), error: null };
}

/**
 * Extract a UID string from a decoded token payload when available.
 * @param {{ uid?: string | null } | null | undefined} decoded Decoded token payload.
 * @returns {string | null} Normalized UID or null when missing.
 */
function getDecodedUidValue(decoded) {
  if (!isDecodedObject(decoded)) {
    return null;
  }

  return extractStringUid(decoded);
}

/**
 * Check whether the decoded payload resembles an object with fields.
 * @param {unknown} decoded Value returned from decoding the token.
 * @returns {boolean} True when the decoded value is an object.
 */
function isDecodedObject(decoded) {
  return Boolean(decoded) && typeof decoded === 'object';
}

/**
 * Return the uid field when it is a string.
 * @param {{ uid?: string | null }} decoded Decoded payload that contains the uid.
 * @returns {string | null} UID string when valid.
 */
function extractStringUid(decoded) {
  if (typeof decoded.uid === 'string') {
    return decoded.uid;
  }

  return null;
}

/**
 * Build the UID result when token verification fails.
 * @param {unknown} error Verification error raised by Firebase Auth.
 * @returns {{ uid: null, error: unknown }} Error result for the resolver.
 */
function buildUidErrorResult(error) {
  return { uid: null, error };
}

/**
 * Format the invalid token response, normalizing any error message for the client.
 * @param {unknown} error Error raised while verifying the token.
 * @returns {ResponderResult} Invalid token response payload.
 */
function createInvalidTokenResponse(error) {
  return {
    ...INVALID_TOKEN_RESPONSE,
    body: getInvalidTokenMessage(error),
  };
}

/**
 * Normalize an error message for invalid token responses.
 * @param {unknown} error Error raised while verifying the token.
 * @returns {string} Message displayed to the client.
 */
function getInvalidTokenMessage(error) {
  const normalized = normalizeString(error?.message);
  return selectInvalidTokenMessage(normalized);
}

/**
 * Choose between a normalized message and the default response body.
 * @param {string | undefined} message Normalized error text.
 * @returns {string} Message to return to the client.
 */
function selectInvalidTokenMessage(message) {
  if (message) {
    return message;
  }

  return INVALID_TOKEN_RESPONSE.body;
}

/**
 * Load the variant snapshot and build the successful response payload.
 * @param {{ db: FirestoreLike, uid: string }} params Dependencies for authorized response building.
 * @returns {Promise<ResponderResult>} Response when a variant is assigned.
 */
async function buildVariantResponse({ db, uid }) {
  const variantSnapshot = await fetchVariantSnapshot(db, uid);

  if (!variantSnapshot) {
    return NO_JOB_RESPONSE;
  }

  return handleVariantSnapshotResponse(variantSnapshot);
}

/**
 * Resolve the response for an existing variant snapshot.
 * @param {VariantSnapshot} variantSnapshot Snapshot describing the assigned variant.
 * @returns {Promise<ResponderResult>} Response payload for the snapshot.
 */
async function handleVariantSnapshotResponse(variantSnapshot) {
  if ('status' in variantSnapshot) {
    return variantSnapshot;
  }

  return buildSuccessVariantResponse(variantSnapshot);
}

/**
 * Load the normalized story title and option list for a variant snapshot.
 * @param {VariantSnapshot} variantSnapshot Snapshot describing the assigned variant.
 * @returns {Promise<{ storyTitle: string, options: VariantOption[] }>} Title and options payload.
 */
async function resolveVariantTitleAndOptions(variantSnapshot) {
  const { variantRef } = variantSnapshot;
  const [storyTitle, options] = await Promise.all([
    fetchStoryTitle(variantRef),
    buildOptions(variantRef),
  ]);

  return { storyTitle, options };
}

/**
 * Compose the successful variant payload from a snapshot.
 * @param {VariantSnapshot} variantSnapshot Snapshot describing the assigned variant.
 * @returns {Promise<ResponderResult>} Success response payload.
 */
async function buildSuccessVariantResponse(variantSnapshot) {
  const variantData = extractVariantData(variantSnapshot);

  const { storyTitle, options } =
    await resolveVariantTitleAndOptions(variantSnapshot);

  return buildVariantResponsePayload({
    storyTitle,
    variantData,
    options,
  });
}

/**
 * Build the HTTP response payload for a successful variant lookup.
 * @param {{ storyTitle: string, variantData: Record<string, unknown>, options: VariantOption[] }} params Response data.
 * @returns {ResponderResult} Successful response payload.
 */
function buildVariantResponsePayload({ storyTitle, variantData, options }) {
  return {
    status: 200,
    body: {
      title: storyTitle,
      content: normalizeString(variantData.content),
      author: normalizeString(variantData.author),
      options,
    },
  };
}

/**
 * Extract the non-null variant data from a snapshot.
 * @param {VariantSnapshot} variantSnapshot Snapshot describing the assigned variant.
 * @returns {Record<string, unknown>} Valid variant document data.
 */
function extractVariantData(variantSnapshot) {
  const { variantSnap } = variantSnapshot;
  return variantSnap.data();
}
