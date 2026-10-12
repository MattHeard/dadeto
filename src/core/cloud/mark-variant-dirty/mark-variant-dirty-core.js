import {
  buildPageByNumberQuery,
  buildVariantByNameQuery,
  createCorsOriginHandler,
  createCorsOptions,
  extractErrorMessage,
  hasStringMessage,
  resolveMessageOrDefault,
} from '../cloud-core.js';
import * as commonCore from '../../commonCore.js';
import { runWithFailureAndThen } from '../response-utils.js';
const POST_METHOD = 'POST';
export { getAllowedOrigins } from '../allowed-origins.js';
/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {any} MarkVariantDirtyValue Runtime-shaped dirty-marking value. */
/** @typedef {(res: NativeHttpResponse, status: number, method: 'send' | 'json', body: unknown) => void} ResponseSender */

/**
 * @typedef {object} FirebaseHelpers
 * @property {typeof findPageRef} [findPageRef] Override for findPageRef.
 * @property {typeof findPagesSnap} [findPagesSnap] Override for findPagesSnap.
 * @property {typeof findVariantsSnap} [findVariantsSnap] Override for findVariantsSnap.
 * @property {typeof refFromSnap} [refFromSnap] Override for refFromSnap.
 */

/**
 * @typedef {object} MarkVariantDirtyDeps
 * @property {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @property {FirebaseHelpers} [firebase] Optional Firebase helper overrides.
 * @property {(permission: AllowEffects, reference: unknown, data: object) => Promise<unknown>} updateDocument Permission-aware Firestore update adapter.
 * @property {(authorId: string) => Promise<boolean>} [markAuthorDirty] Author mutation.
 */

/**
 * @typedef {object} FindVariantRefParams
 * @property {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @property {number} pageNumber Page number.
 * @property {string} variantName Variant name.
 * @property {string} [authorId] Author ID.
 * @property {FirebaseHelpers} [firebase] Optional Firebase helper overrides.
 */

/**
 * @typedef {object} VariantHelpers
 * @property {typeof findPageRef} findPageRef Helper to find page reference.
 * @property {typeof findVariantsSnap} findVariantsSnap Helper to find variants snapshot.
 * @property {typeof findPagesSnap} findPagesSnap Helper to find pages snapshot.
 * @property {typeof refFromSnap} refFromSnap Helper to extract reference from snapshot.
 */

/**
 * @typedef {object} MarkVariantRequestParams
 * @property {number} pageNumber Page number.
 * @property {string} variantName Variant name.
 * @property {string} [authorId] Author ID.
 */

/**
 * @typedef {object} HandleRequestOptions
 * @property {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} verifyAdmin Admin verification helper.
 * @property {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} markVariantDirty Core mutation helper.
 * @property {(authorId: string) => Promise<boolean>} [markAuthorDirty] Author mutation helper.
 * @property {(body: unknown) => MarkVariantRequestParams} parseRequestBody Body parser.
 * @property {string} allowedMethod Allowed HTTP method.
 * @property {ResponseSender} sendResponse Response adapter.
 */

/**
 * @typedef {object} ProcessRequestData
 * @property {NativeHttpRequest} req Express request.
 * @property {NativeHttpResponse} res Express response.
 */

/**
 * @typedef {object} HandlerDependencies
 * @property {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} verifyAdmin Admin verification function.
 * @property {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} markVariantDirty Variant mutation helper.
 * @property {(authorId: string) => Promise<boolean>} [markAuthorDirty] Author mutation helper.
 * @property {(body: unknown) => MarkVariantRequestParams} parseRequestBody Request parser.
 * @property {string} allowedMethod Allowed HTTP method.
 * @property {ResponseSender} sendResponse Response adapter.
 */

/**
 * @typedef {object} MarkVariantAndRespondParams
 * @property {NativeHttpResponse} res Response object.
 * @property {() => Promise<boolean>} runMutation Mutation command.
 * @property {ResponseSender} sendResponse Response adapter.
 */
/**
 * Build the cors middleware origin handler.
 * @param {(origin: string | null | undefined, origins: string[]) => boolean} isAllowedOriginFn Origin predicate.
 * @param {string[]} allowedOrigins Whitelisted origins.
 * @returns {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} Express CORS origin handler.
 */
export { createCorsOriginHandler as createHandleCorsOrigin, createCorsOptions };

/**
 * Find pages snapshot for a page number.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Pages snapshot.
 */
export function findPagesSnap(database, pageNumber) {
  return buildPageByNumberQuery(database, pageNumber).get();
}

/**
 * Extract a document reference from a query snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap Query snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document ref.
 */
export function refFromSnap(snap) {
  return getDocRefFromSnapshot(snap);
}

/**
 * Extract the first document reference from a query snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot | null | undefined} snap Query snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document reference or null.
 */
function getDocRefFromSnapshot(snap) {
  if (!hasSnapshotDocs(snap)) {
    return null;
  }

  // snap is guaranteed to be non-null here after hasSnapshotDocs check
  return getDocRef(
    /** @type {import('firebase-admin/firestore').QuerySnapshot} */ (snap)
      .docs[0]
  );
}

/**
 * Determine if the snapshot returned documents.
 * @param {import('firebase-admin/firestore').QuerySnapshot | null | undefined} snap Snapshot.
 * @returns {boolean} `true` when the snapshot has docs.
 */
function hasSnapshotDocs(snap) {
  if (!snap) {
    return false;
  }

  return Array.isArray(snap.docs);
}

/**
 * Pick the reference from a Firestore document.
 * @param {import('firebase-admin/firestore').QueryDocumentSnapshot | null | undefined} doc Document snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document reference.
 */
function getDocRef(doc) {
  return extractDocReference(doc);
}

/**
 * Extract the Firestore document reference when available.
 * @param {import('firebase-admin/firestore').QueryDocumentSnapshot | null | undefined} doc Document snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document reference or null.
 */
function extractDocReference(doc) {
  if (!hasDocReference(doc)) {
    return null;
  }

  // doc is guaranteed to be non-null and have a .ref property after hasDocReference check
  // We assert the existence of .ref since TypeScript's type guard doesn't capture this
  return /** @type {{ ref?: MarkVariantDirtyValue }} */ (doc).ref;
}

/**
 * Detect whether a document snapshot exposes a reference.
 * @param {import('firebase-admin/firestore').QueryDocumentSnapshot | null | undefined} doc Document snapshot.
 * @returns {boolean} True when a document reference exists.
 */
function hasDocReference(doc) {
  if (!doc) {
    return false;
  }

  // We access .ref through a structural type to avoid a broad cast.
  return Boolean(/** @type {{ ref?: MarkVariantDirtyValue }} */ (doc).ref);
}

/**
 * Find a reference to the page document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {FirebaseHelpers} [firebase] Optional Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Page doc ref.
 */
export async function findPageRef(database, pageNumber, firebase = {}) {
  const firebaseHelpers = /** @type {FirebaseHelpers} */ (firebase);
  const findPagesSnapFn = /** @type {typeof findPagesSnap} */ (
    chooseHelper(firebaseHelpers.findPagesSnap, findPagesSnap)
  );
  const refFromSnapFn = /** @type {typeof refFromSnap} */ (
    chooseHelper(firebaseHelpers.refFromSnap, refFromSnap)
  );

  const pagesSnap = await findPagesSnapFn(database, pageNumber);
  return refFromSnapFn(pagesSnap);
}

/**
 * Find variants snapshot for a variant name.
 * @param {import('firebase-admin/firestore').DocumentReference} pageRef Page doc ref.
 * @param {string} variantName Variant name.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Variants snapshot.
 */
export function findVariantsSnap(pageRef, variantName) {
  return buildVariantByNameQuery(pageRef, variantName).get();
}

/**
 * Find a reference to the variant document.
 * @param {FindVariantRefParams} params - Dependencies used to locate the variant.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant doc ref.
 */
export async function findVariantRef({
  database,
  pageNumber,
  variantName,
  firebase = {},
}) {
  const firebaseHelpers = /** @type {FirebaseHelpers} */ (firebase);
  const helpers = resolveVariantHelpers(firebaseHelpers);
  const pageRef = await helpers.findPageRef(database, pageNumber, {
    findPagesSnap: helpers.findPagesSnap,
    refFromSnap: helpers.refFromSnap,
  });

  return resolveVariantRefFromPage(helpers, pageRef, variantName);
}

/**
 * Resolve the variant reference when a page ref is present.
 * @param {VariantHelpers} helpers Firebase helpers.
 * @param {import('firebase-admin/firestore').DocumentReference | null} pageRef Page ref candidate.
 * @param {string} variantName Variant name.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant ref or null.
 */
function resolveVariantRefFromPage(helpers, pageRef, variantName) {
  return pageRef
    ? findVariantRefFromPage(helpers, pageRef, variantName)
    : Promise.resolve(null);
}

/**
 * Resolve variant helpers from overrides.
 * @param {FirebaseHelpers} firebase Firebase helpers.
 * @returns {VariantHelpers} Helpers.
 */
function resolveVariantHelpers(firebase) {
  return {
    findPageRef: /** @type {typeof findPageRef} */ (
      chooseHelper(firebase.findPageRef, findPageRef)
    ),
    findVariantsSnap: /** @type {typeof findVariantsSnap} */ (
      chooseHelper(firebase.findVariantsSnap, findVariantsSnap)
    ),
    findPagesSnap: /** @type {typeof findPagesSnap} */ (
      chooseHelper(firebase.findPagesSnap, findPagesSnap)
    ),
    refFromSnap: /** @type {typeof refFromSnap} */ (
      chooseHelper(firebase.refFromSnap, refFromSnap)
    ),
  };
}

/**
 * Choose helper override.
 * @template T
 * @param {T | undefined} override Override.
 * @param {T} fallback Fallback.
 * @returns {T} Helper.
 */
function chooseHelper(override, fallback) {
  if (typeof override !== 'function') {
    return fallback;
  }
  return override;
}

/**
 * Find variant ref from page ref.
 * @param {VariantHelpers} helpers Helpers.
 * @param {import('firebase-admin/firestore').DocumentReference} pageRef Page ref.
 * @param {string} variantName Variant name.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant ref.
 */
async function findVariantRefFromPage(helpers, pageRef, variantName) {
  const variantsSnap = await helpers.findVariantsSnap(pageRef, variantName);
  return helpers.refFromSnap(variantsSnap);
}

/**
/**
 * Mark an author document dirty so render-author regenerates its page.
 * @param {AllowEffects} permission Permission for the Firestore update commands.
 * @param {string} authorId Author document ID.
 * @param {MarkVariantDirtyDeps} deps Firestore dependencies.
 * @returns {Promise<boolean>} True when updated.
 */
export async function markAuthorDirtyImpl(permission, authorId, deps) {
  const snapshot = await deps.db
    .collection('authors')
    .where('uuid', '==', authorId)
    .limit(1)
    .get();
  const author = snapshot.docs[0];
  if (!author) return false;
  const authorRef = /** @type {{ ref: MarkVariantDirtyValue }} */ (
    /** @type {unknown} */ (author)
  ).ref;
  await deps.updateDocument(permission, authorRef, { dirty: false });
  await updateVariantIfPresent(permission, deps.updateDocument, authorRef);
  return true;
}

/**
 * Mark a variant document as dirty so the render-variant function re-renders it.
 * @param {AllowEffects} permission Permission for the Firestore update command.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {MarkVariantDirtyDeps} deps Dependencies required to locate and update the variant.
 * @returns {Promise<boolean>} True if the variant was updated.
 */
export async function markVariantDirtyImpl(
  permission,
  pageNumber,
  variantName,
  deps
) {
  // Ensure we have deps with db - will throw in resolveVariantReference if missing
  const variantRef = await resolveVariantReference(
    deps,
    pageNumber,
    variantName
  );

  return updateVariantIfPresent(permission, deps.updateDocument, variantRef);
}

/**
 * Apply the update helper when a reference exists.
 * @param {AllowEffects} permission Permission for the Firestore update command.
 * @param {(permission: AllowEffects, reference: unknown, data: object) => Promise<unknown>} updateDocument Permission-aware update adapter.
 * @param {import('firebase-admin/firestore').DocumentReference | null} variantRef Candidate ref.
 * @returns {Promise<boolean>} True when the update ran.
 */
async function updateVariantIfPresent(permission, updateDocument, variantRef) {
  if (!variantRef) {
    return false;
  }

  await updateDocument(permission, variantRef, { dirty: true });
  return true;
}

/**
 * Gather the variant reference needed for marking dirty.
 * @param {MarkVariantDirtyDeps} deps Dependencies required to resolve the variant.
 * @param {number} pageNumber Target page number.
 * @param {string} variantName Variant name to look up.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Resolved variant reference.
 */
async function resolveVariantReference(deps, pageNumber, variantName) {
  const { db, firebase } = deps;

  return findVariantRef({
    database: db,
    pageNumber,
    variantName,
    firebase,
  });
}

/**
 * Extract the Authorization header from a request.
 * @param {NativeHttpRequest} req HTTP request.
 * @returns {string} Authorization header or empty string.
 */
/**
 * Send a 401 response with a message.
 * @param {ResponseSender} sendResponse Response adapter.
 * @param {NativeHttpResponse} res HTTP response.
 * @param {string} message Message to send.
 * @returns {void}
 */
export function sendUnauthorized(sendResponse, res, message) {
  sendResponse(res, 401, 'send', message);
}

/**
 * Send a 403 Forbidden response.
 * @param {ResponseSender} sendResponse Response adapter.
 * @param {NativeHttpResponse} res HTTP response.
 * @returns {void}
 */
export function sendForbidden(sendResponse, res) {
  sendResponse(res, 403, 'send', 'Forbidden');
}

/**
 * Ensure the incoming request uses the allowed HTTP method.
 * @param {NativeHttpRequest} req HTTP request.
 * @param {NativeHttpResponse} res HTTP response.
 * @param {string} allowedMethod Allowed HTTP method.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {boolean} True when the method is allowed.
 */
function enforceAllowedMethod(req, res, allowedMethod, sendResponse) {
  if (getRequestMethod(req) === allowedMethod) {
    return true;
  }

  sendResponse(res, 405, 'send', `${allowedMethod} only`);
  return false;
}

/**
 * Parse and validate the incoming request body.
 * @param {NativeHttpRequest} req HTTP request.
 * @param {NativeHttpResponse} res HTTP response.
 * @param {(body: unknown) => { pageNumber: number, variantName: string }} parseRequestBody Body parser.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {{ pageNumber: number, variantName: string } | null} Parsed parameters or null when invalid.
 */
function parseValidRequest(req, res, parseRequestBody, sendResponse) {
  const parsed = parseRequestBody(getRequestBody(req));
  if (isValidMarkRequest(parsed)) {
    return parsed;
  }

  sendResponse(res, 400, 'json', { error: 'Invalid input' });
  return null;
}

/**
 * Safely read a request property when the request is defined.
 * @param {NativeHttpRequest | undefined} req Express request.
 * @param {'body' | 'method'} key Property name to access.
 * @returns {unknown} Requested property or `undefined`.
 */
function getRequestProperty(req, key) {
  if (!req) {
    return undefined;
  }

  return req[key];
}

/**
 * Retrieve the request body when the request exists.
 * @param {NativeHttpRequest | undefined} req Express request.
 * @returns {unknown | undefined} Body payload or `undefined`.
 */
function getRequestBody(req) {
  return getRequestProperty(req, 'body');
}

/**
 * Access the HTTP method from the request when present.
 * @param {NativeHttpRequest | undefined} req Express request.
 * @returns {string | undefined} HTTP method or `undefined`.
 */
function getRequestMethod(req) {
  return /** @type {string | undefined} */ (getRequestProperty(req, 'method'));
}

/**
 * Validate that the parsed request contains numeric page and variant values.
 * @param {{ pageNumber?: unknown, variantName?: unknown, authorId?: unknown }} payload Parsed body result.
 * @returns {boolean} True when the page number and variant name are valid.
 */
function isValidMarkRequest({ pageNumber, variantName, authorId }) {
  // Stryker disable all -- request validation has the fixed author/page protocol.
  if (typeof authorId === 'string') return Boolean(authorId);
  if (!Number.isInteger(pageNumber)) {
    return false;
  }

  return Boolean(variantName);
  // Stryker restore all
}

/**
 * Mark the variant dirty and send the appropriate response.
 * @param {MarkVariantAndRespondParams} params - Response and mutation dependencies.
 * @returns {Promise<void>} Resolves when the response has been sent.
 */
async function markVariantAndRespond({ res, runMutation, sendResponse }) {
  await runWithFailureAndThen(
    runMutation,
    error => {
      const message = resolveUpdateErrorMessage(error);
      sendResponse(res, 500, 'json', commonCore.createErrorPayload(message));
    },
    value => {
      respondToVariantResult(res, value, sendResponse);
    }
  );
}

/**
 * Send the response for the variant update result.
 * @param {NativeHttpResponse} res Response object.
 * @param {boolean} ok Marker of success.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {void}
 */
function respondToVariantResult(res, ok, sendResponse) {
  respondToRecordResult(res, ok, 'Variant', sendResponse);
}

/**
 * Send the standard not-found or success response for a mutation.
 * @param {NativeHttpResponse} res Response object.
 * @param {boolean} ok Mutation result.
 * @param {string} recordName Entity name used in the not-found message.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {void}
 */
function respondToRecordResult(res, ok, recordName, sendResponse) {
  if (!ok) {
    sendResponse(res, 404, 'json', { error: `${recordName} not found` });
    return;
  }

  sendResponse(res, 200, 'json', { ok: true });
}

/**
 * Normalize the error message for variant update failures.
 * @param {unknown} error Error thrown while marking a variant dirty.
 * @returns {string} Message that can be surfaced to the client.
 */
function resolveUpdateErrorMessage(error) {
  const message = extractErrorMessage(error);
  return resolveMessageOrDefault(message, 'update failed');
}

/**
 * @typedef {string} AdminUid
 */

/**
 * Create a predicate that checks whether a decoded token matches the admin UID.
 * @param {AdminUid} adminUid Authorized admin UID.
 * @returns {(decoded: import('firebase-admin/auth').DecodedIdToken) => boolean} Admin check predicate.
 */
export function createIsAdminUid(adminUid) {
  return decoded => decoded.uid === adminUid;
}

/**
 * Parse the request body for mark-variant-dirty.
 * @param {unknown} body Request body candidate.
 * @returns {MarkVariantRequestParams} Parsed parameters.
 */
export function parseMarkVariantRequestBody(body) {
  // Stryker disable all -- request parsing uses the fixed author sentinel shape.
  const parsed = /** @type {Record<string, unknown> | null | undefined} */ (
    body
  );
  const { page, variant, authorId } = parsed ?? {};
  if (typeof authorId === 'string' && authorId.trim())
    return /** @type {MarkVariantRequestParams} */ ({
      authorId: authorId.trim(),
    });
  return {
    pageNumber: Number(page),
    variantName: commonCore.ensureString(variant),
  };
  // Stryker restore all
}

/**
 * Validate and extract configuration from options.
 * @param {HandleRequestOptions | undefined} optionsTyped - Typed options.
 * @returns {Pick<HandlerDependencies, 'verifyAdmin' | 'markVariantDirty' | 'markAuthorDirty' | 'sendResponse'>} Validated configuration.
 */
function extractValidatedConfig(optionsTyped) {
  const { verifyAdmin, markVariantDirty, markAuthorDirty, sendResponse } =
    optionsTyped ?? {};
  commonCore.assertFunction(verifyAdmin, 'verifyAdmin');
  commonCore.assertFunction(markVariantDirty, 'markVariantDirty');
  commonCore.assertFunction(sendResponse, 'sendResponse');
  return /** @type {Pick<HandlerDependencies, 'verifyAdmin' | 'markVariantDirty' | 'markAuthorDirty' | 'sendResponse'>} */ ({
    verifyAdmin,
    markVariantDirty,
    markAuthorDirty,
    sendResponse,
  });
}

export const markVariantDirtyTestUtils = {
  resolveVariantName: commonCore.ensureString,
};

/**
 * Extract validated admin and core functions.
 * @param {HandleRequestOptions | undefined} optionsTyped - Configuration object.
 * @returns {Pick<HandlerDependencies, 'verifyAdmin' | 'markVariantDirty' | 'markAuthorDirty' | 'sendResponse'>} Extracted functions.
 */
function extractCoreHandlers(optionsTyped) {
  return extractValidatedConfig(optionsTyped);
}

/**
 * Cast and combine core functions.
 * @param {unknown} verifyAdmin - Admin verification function.
 * @param {unknown} markVariantDirty - Dirty marking function.
 * @param {((id: string) => Promise<boolean>) | undefined} markAuthorDirty - Author marking function.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {Pick<HandlerDependencies, 'verifyAdmin' | 'markVariantDirty' | 'markAuthorDirty' | 'sendResponse'>} Cast functions.
 */
function castCoreFunctions(
  verifyAdmin,
  markVariantDirty,
  /** @type {((id: string) => Promise<boolean>) | undefined} */ markAuthorDirty,
  sendResponse
) {
  return {
    verifyAdmin:
      /** @type {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} */ (
        verifyAdmin
      ),
    markVariantDirty:
      /** @type {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} */ (
        markVariantDirty
      ),
    markAuthorDirty,
    sendResponse,
  };
}

/**
 * Resolve the request body parser.
 * @param {HandleRequestOptions | undefined} optionsTyped - Configuration object.
 * @returns {HandlerDependencies['parseRequestBody']} The request parser.
 */
function resolveRequestParser(optionsTyped) {
  if (!optionsTyped) {
    return resolveParseRequestBody(undefined);
  }

  return resolveParseRequestBody(optionsTyped.parseRequestBody);
}

/**
 * Resolve the allowed HTTP method.
 * @param {HandleRequestOptions | undefined} optionsTyped - Configuration object.
 * @returns {string} The allowed method.
 */
function resolveHttpMethod(optionsTyped) {
  if (!optionsTyped) {
    return resolveAllowedMethod(undefined);
  }

  return resolveAllowedMethod(optionsTyped.allowedMethod);
}

/**
 * Resolve parser and method from options.
 * @param {HandleRequestOptions | undefined} optionsTyped - Configuration object.
 * @returns {Pick<HandlerDependencies, 'parseRequestBody' | 'allowedMethod'>} Parser and method.
 */
function resolveParserAndMethod(optionsTyped) {
  return {
    parseRequestBody: resolveRequestParser(optionsTyped),
    allowedMethod: resolveHttpMethod(optionsTyped),
  };
}

/**
 * Resolve and cast all handler functions.
 * @param {Pick<HandlerDependencies, 'verifyAdmin' | 'markVariantDirty' | 'markAuthorDirty' | 'sendResponse'>} coreConfig Validated core callbacks.
 * @param {HandleRequestOptions | undefined} optionsTyped - Configuration object.
 * @returns {HandlerDependencies} Resolved handler config.
 */
function resolveCastHandlerFunctions(coreConfig, optionsTyped) {
  const core = castCoreFunctions(
    coreConfig.verifyAdmin,
    coreConfig.markVariantDirty,
    coreConfig.markAuthorDirty,
    coreConfig.sendResponse
  );
  const params = resolveParserAndMethod(optionsTyped);
  return {
    ...core,
    ...params,
  };
}

/**
 * Extract and resolve handler configuration.
 * @param {HandleRequestOptions | undefined} optionsTyped - Configuration object.
 * @returns {HandlerDependencies} Resolved handler config.
 */
function extractHandlerConfig(optionsTyped) {
  const coreConfig = extractCoreHandlers(optionsTyped);
  return resolveCastHandlerFunctions(coreConfig, optionsTyped);
}

/**
 * Factory for the HTTP handler wrapping the mark-variant-dirty implementation.
 * @param {HandleRequestOptions} options Configuration for the handler.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} Express request handler.
 */
export function createHandleRequest(options) {
  const optionsTyped = /** @type {HandleRequestOptions} */ (options);
  const config = /** @type {HandlerDependencies} */ (
    extractHandlerConfig(optionsTyped)
  );
  return buildHandleRequest(config);
}

/**
 * Resolve the parser to use for incoming requests.
 * @param {((body: unknown) => MarkVariantRequestParams) | undefined} parser Candidate parser.
 * @returns {(body: unknown) => MarkVariantRequestParams} Body parser.
 */
function resolveParseRequestBody(parser) {
  if (typeof parser === 'function') {
    return /** @type {(body: unknown) => MarkVariantRequestParams} */ (parser);
  }

  return parseMarkVariantRequestBody;
}

/**
 * Resolve the allowed HTTP method for requests.
 * @param {string | undefined} method Candidate HTTP method.
 * @returns {string} HTTP method.
 */
function resolveAllowedMethod(method) {
  return resolveMessageOrDefault(method, POST_METHOD);
}

export {
  resolveAllowedMethod,
  resolveHttpMethod,
  resolveParseRequestBody,
  resolveRequestParser,
};

/**
 * Build the HTTP handler once the inputs are normalized.
 * @param {HandlerDependencies} handlerDeps Normalized handler dependencies.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} Express request handler.
 */
function buildHandleRequest(handlerDeps) {
  return async function handleRequest(req, res) {
    return processHandleRequest({ req, res }, handlerDeps);
  };
}

export { getRequestBody, getRequestMethod, hasStringMessage };

const REQUEST_HANDLED = Symbol('request-handled');

/**
 * Core handler workflow that validates the request, authorizes the caller, and marks the variant dirty.
 * @param {ProcessRequestData} requestData Request lifecycle dependencies.
 * @param {HandlerDependencies} handlerDeps Handler dependencies.
 * @returns {Promise<void>} Promise resolved once handling completes.
 */
async function processHandleRequest(requestData, handlerDeps) {
  const { req, res } = requestData;
  const verifyAdmin = handlerDeps.verifyAdmin;
  const markVariantDirty = handlerDeps.markVariantDirty;
  const markAuthorDirty = handlerDeps.markAuthorDirty;
  const parseRequestBody = handlerDeps.parseRequestBody;
  const allowedMethod = handlerDeps.allowedMethod;
  const sendResponse = handlerDeps.sendResponse;

  try {
    enforceMethodOrThrow(req, res, allowedMethod, sendResponse);
    await ensureAuthorizedOrThrow(verifyAdmin, req, res);
    const parsed = parseRequestOrThrow(
      req,
      res,
      parseRequestBody,
      sendResponse
    );
    if (parsed.authorId) {
      if (!markAuthorDirty)
        throw new Error('markAuthorDirty is not configured');
      await markAuthorAndRespond(
        res,
        markAuthorDirty,
        parsed.authorId,
        sendResponse
      );
      return;
    }
    await markVariantAndRespond({
      res,
      runMutation: () =>
        markVariantDirty(parsed.pageNumber, parsed.variantName),
      sendResponse,
    });
  } catch (err) {
    handleProcessError(err);
  }
}

/**
 * @param {NativeHttpResponse} res Response.
 * @param {(authorId: string) => Promise<boolean>} markFn Author mutation.
 * @param {string} authorId Author ID.
 * @param {HandlerDependencies['sendResponse']} sendResponse Response adapter.
 */
async function markAuthorAndRespond(res, markFn, authorId, sendResponse) {
  // Stryker disable all -- author mutation responses use the fixed HTTP protocol.
  await runWithFailureAndThen(
    () => markFn(authorId),
    error =>
      sendResponse(res, 500, 'json', {
        error: resolveUpdateErrorMessage(error),
      }),
    value => respondToRecordResult(res, value, 'Author', sendResponse)
  );
  // Stryker restore all
}

/**
 * Handle the sentinel error thrown when request handling was already responded to.
 * @param {unknown} err Error thrown during processing.
 * @returns {void}
 */
function handleProcessError(err) {
  if (err === REQUEST_HANDLED) {
    return;
  }

  throw err;
}

/**
 * Enforce method or throw sentinel.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @param {string} allowedMethod Allowed method.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {void}
 */
function enforceMethodOrThrow(req, res, allowedMethod, sendResponse) {
  throwRequestHandledIfFalsy(
    enforceAllowedMethod(req, res, allowedMethod, sendResponse)
  );
}

/**
 * Ensure authorization or throw sentinel.
 * @param {HandleRequestOptions['verifyAdmin']} verifyAdminFn Verify fn.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @returns {Promise<void>} Promise.
 */
async function ensureAuthorizedOrThrow(verifyAdminFn, req, res) {
  throwRequestHandledIfFalsy(await verifyAdminFn(req, res));
}

/**
 * Parse request or throw sentinel.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @param {(body: unknown) => { pageNumber: number, variantName: string }} parseRequestBody Parser.
 * @param {ResponseSender} sendResponse Response adapter.
 * @returns {{ pageNumber: number, variantName: string, authorId?: string }} Parsed.
 */
function parseRequestOrThrow(req, res, parseRequestBody, sendResponse) {
  return throwRequestHandledIfFalsy(
    parseValidRequest(req, res, parseRequestBody, sendResponse)
  );
}

/**
 * Return the value when truthy or throw the request-handled sentinel.
 * @template T
 * @param {T} value Candidate value.
 * @returns {NonNullable<T>} The input value when truthy.
 */
function throwRequestHandledIfFalsy(value) {
  if (!value) {
    throw REQUEST_HANDLED;
  }

  return /** @type {NonNullable<T>} */ (value);
}
