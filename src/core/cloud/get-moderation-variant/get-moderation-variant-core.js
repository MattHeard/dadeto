import { normalizeString, productionOrigins } from './cloud-core.js';
import { isAllowedOrigin as coreIsAllowedOrigin } from './cors.js';

export { productionOrigins, coreIsAllowedOrigin as isAllowedOrigin };

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
  if (!db || typeof db.collection !== 'function') {
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
  if (!auth || typeof auth.verifyIdToken !== 'function') {
    throw new TypeError('auth.verifyIdToken must be a function');
  }
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

  const match = authHeader.match(/^Bearer (.+)$/);

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

  if (!moderatorSnap.exists) {
    return null;
  }

  const moderatorData = moderatorSnap.data();
  const variantRef = moderatorData?.variant;

  if (!variantRef) {
    return null;
  }

  const variantSnap = await variantRef.get();

  if (!variantSnap.exists) {
    return VARIANT_NOT_FOUND_RESPONSE;
  }

  return { variantSnap, variantRef };
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
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    if (playwrightOrigin) {
      return [playwrightOrigin];
    }
    return [];
  }

  return productionOrigins;
}
/**
 * Builds a CORS origin handler backed by the shared allow list predicate.
 * @param {(origin: string | undefined, origins: string[]) => boolean} isAllowedOrigin Predicate used to validate incoming origins.
 * @param {string[]} origins Whitelist of origins allowed to access the endpoint.
 * @returns {HandleCorsOrigin} Node-style origin handler consumed by the cors middleware.
 */
export function createHandleCorsOrigin(isAllowedOrigin, origins) {
  return (origin, cb) => {
    if (isAllowedOrigin(origin, origins)) {
      cb(null, true);
    } else {
      cb(new Error('CORS'));
    }
  };
}
/**
 * Creates the CORS configuration consumed by the moderation variant endpoint.
 * @param {HandleCorsOrigin} handleCorsOrigin Origin handler used to vet requests.
 * @returns {{ origin: HandleCorsOrigin, methods: string[] }} Configuration object passed to cors().
 */
export function createCorsOptions(handleCorsOrigin) {
  return {
    origin: handleCorsOrigin,
    methods: ['GET'],
  };
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
  const { uid, error } = await resolveUidFromToken(auth, token);

  if (error || !uid) {
    return createInvalidTokenResponse(error);
  }

  return buildVariantResponse({ db, uid });
}

/**
 * Verify the ID token and return the decoded UID.
 * @param {AuthLike} auth Firebase auth helper.
 * @param {string} token ID token string.
 * @returns {Promise<{ uid: string | undefined | null, error: unknown }>} UID result and any verification error.
 */
async function resolveUidFromToken(auth, token) {
  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded?.uid ?? null, error: null };
  } catch (error) {
    return { uid: null, error };
  }
}

/**
 * Format the invalid token response, normalizing any error message for the client.
 * @param {unknown} error Error raised while verifying the token.
 * @returns {ResponderResult} Invalid token response payload.
 */
function createInvalidTokenResponse(error) {
  return {
    ...INVALID_TOKEN_RESPONSE,
    body: normalizeString(error?.message) || INVALID_TOKEN_RESPONSE.body,
  };
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
 * Load the normalized story title and option list for a variant reference.
 * @param {FirestoreDocumentReference} variantRef Variant document reference.
 * @returns {Promise<{ storyTitle: string, options: VariantOption[] }>} Title and options payload.
 */
async function resolveVariantTitleAndOptions(variantRef) {
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
  const { variantSnap, variantRef } = variantSnapshot;
  const variantData = variantSnap.data() ?? {};

  const { storyTitle, options } =
    await resolveVariantTitleAndOptions(variantRef);

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
