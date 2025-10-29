import { productionOrigins } from './cloud-core.js';
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
 * Normalizes an arbitrary value to a safe string representation.
 * @param {unknown} value Value to normalize.
 * @returns {string} Normalized string value.
 */
function normalizeString(value) {
  return typeof value === 'string' ? value : '';
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

  return match ? match[1] : null;
}
/**
 * Reads the Authorization header from an Express-style request object.
 * @param {RequestLike | null | undefined} request Incoming HTTP request.
 * @returns {string | null} Authorization header string when provided, otherwise null.
 */
function getAuthorizationHeader(request) {
  if (request && typeof request.get === 'function') {
    const header = request.get('Authorization') ?? request.get('authorization');

    if (typeof header === 'string') {
      return header;
    }
  }

  const headers = request?.headers;
  if (headers && typeof headers === 'object') {
    const header = headers.authorization ?? headers.Authorization;

    if (Array.isArray(header)) {
      return header[0] ?? null;
    }

    if (typeof header === 'string') {
      return header;
    }
  }

  return null;
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
  const pageRef = variantRef.parent?.parent;
  const pageSnap = pageRef ? await pageRef.get() : null;

  if (!pageSnap?.exists) {
    return '';
  }

  const storyRef = pageSnap.ref.parent?.parent;
  const storySnap = storyRef ? await storyRef.get() : null;

  if (!storySnap?.exists) {
    return '';
  }

  const storyData = storySnap.data();

  return normalizeString(storyData?.title);
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
    return playwrightOrigin ? [playwrightOrigin] : [];
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
    const authHeader = getAuthorizationHeader(request);
    const token = parseAuthorizationHeader(authHeader);

    if (!token) {
      return MISSING_AUTHORIZATION_RESPONSE;
    }

    let uid;

    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded?.uid;
    } catch (error) {
      return {
        ...INVALID_TOKEN_RESPONSE,
        body: normalizeString(error?.message) || INVALID_TOKEN_RESPONSE.body,
      };
    }

    if (!uid) {
      return INVALID_TOKEN_RESPONSE;
    }

    const variantSnapshot = await fetchVariantSnapshot(db, uid);

    if (!variantSnapshot) {
      return NO_JOB_RESPONSE;
    }

    if ('status' in variantSnapshot) {
      return variantSnapshot;
    }

    const { variantSnap, variantRef } = variantSnapshot;
    const variantData = variantSnap.data() ?? {};

    const [storyTitle, options] = await Promise.all([
      fetchStoryTitle(variantRef),
      buildOptions(variantRef),
    ]);

    return {
      status: 200,
      body: {
        title: storyTitle,
        content: normalizeString(variantData.content),
        author: normalizeString(variantData.author),
        options,
      },
    };
  };
}
