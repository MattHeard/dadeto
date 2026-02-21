import {
  createCorsOriginHandler,
  createCorsOptions,
  extractErrorMessage,
  hasStringMessage,
  sendOkResponse,
  resolveMessageOrDefault,
} from '../cloud-core.js';
import {
  buildPageByNumberQuery,
  buildVariantByNameQuery,
} from '../firestore-helpers.js';
import {
  assertFunction,
  ensureString,
  stringOrDefault,
} from '../common-core.js';
import { runWithFailureAndThen } from '../response-utils.js';
const POST_METHOD = 'POST';
export { getAllowedOrigins } from '../allowed-origins.js';
/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

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
 * @property {typeof updateVariantDirty} [updateVariantDirty] Override for updateVariantDirty.
 */

/**
 * @typedef {object} FindVariantRefParams
 * @property {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @property {number} pageNumber Page number.
 * @property {string} variantName Variant name.
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
 */

/**
 * @typedef {object} HandleRequestOptions
 * @property {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} verifyAdmin Admin verification helper.
 * @property {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} markVariantDirty Core mutation helper.
 * @property {(body: unknown) => MarkVariantRequestParams} [parseRequestBody] Body parser.
 * @property {string} [allowedMethod] Allowed HTTP method.
 */

/**
 * @typedef {object} HandleRequestDeps
 * @property {typeof markVariantDirtyImpl} [markFn] Override for marking variant dirty.
 * @property {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} [verifyAdmin] Override for admin verification.
 */

/**
 * @typedef {object} ProcessRequestData
 * @property {NativeHttpRequest} req Express request.
 * @property {NativeHttpResponse} res Express response.
 * @property {HandleRequestDeps} [deps] Optional overrides.
 */

/**
 * @typedef {object} HandlerDependencies
 * @property {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} verifyAdmin Admin verification function.
 * @property {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} markVariantDirty Variant mutation helper.
 * @property {(body: unknown) => MarkVariantRequestParams} parseRequestBody Request parser.
 * @property {string} allowedMethod Allowed HTTP method.
 */

/**
 * @typedef {object} MarkVariantAndRespondParams
 * @property {NativeHttpResponse} res Response object.
 * @property {(pageNumber: number, variantName: string) => Promise<boolean>} markFn Marking function.
 * @property {number} pageNumber Page number.
 * @property {string} variantName Variant name.
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
  return /** @type {any} */ (doc).ref;
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

  // We access .ref through any to avoid TypeScript ref property issue
  return Boolean(/** @type {any} */ (doc).ref);
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
  if (!pageRef) {
    return Promise.resolve(null);
  }

  return findVariantRefFromPage(helpers, pageRef, variantName);
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
  if (typeof override === 'function') {
    return /** @type {any} */ (override);
  }

  return fallback;
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
 * Update a variant document with a dirty flag.
 * @param {import('firebase-admin/firestore').DocumentReference} variantRef Variant doc ref.
 * @returns {Promise<void>} Promise resolving when update completes.
 */
export function updateVariantDirty(variantRef) {
  return variantRef.update({ dirty: null });
}

/**
 * Mark a variant document as dirty so the render-variant function re-renders it.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {MarkVariantDirtyDeps} [deps] Dependencies required to locate and update the variant.
 * @returns {Promise<boolean>} True if the variant was updated.
 */
export async function markVariantDirtyImpl(pageNumber, variantName, deps) {
  // Ensure we have deps with db - will throw in resolveVariantReference if missing
  const depsTyped = /** @type {MarkVariantDirtyDeps | undefined} */ (deps);

  const variantRef = await resolveVariantReference(
    depsTyped,
    pageNumber,
    variantName
  );

  return updateVariantIfPresent(depsTyped?.updateVariantDirty, variantRef);
}

/**
 * Apply the update helper when a reference exists.
 * @param {Function | undefined} updateVariantDirtyFn Update override.
 * @param {import('firebase-admin/firestore').DocumentReference | null} variantRef Candidate ref.
 * @returns {Promise<boolean>} True when the update ran.
 */
async function updateVariantIfPresent(updateVariantDirtyFn, variantRef) {
  if (!variantRef) {
    return false;
  }

  await applyUpdateFn(updateVariantDirtyFn, variantRef);
  return true;
}

/**
 * Gather the variant reference needed for marking dirty.
 * @param {MarkVariantDirtyDeps | undefined} deps Dependencies required to resolve the variant.
 * @param {number} pageNumber Target page number.
 * @param {string} variantName Variant name to look up.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Resolved variant reference.
 */
async function resolveVariantReference(deps, pageNumber, variantName) {
  const { db, firebase = {} } = deps ?? {};

  enforceDatabase(db);

  // After enforceDatabase, db is guaranteed to be non-null
  const dbTyped = /** @type {import('firebase-admin/firestore').Firestore} */ (
    db
  );

  return findVariantRef({
    database: dbTyped,
    pageNumber,
    variantName,
    firebase,
  });
}

/**
 * Ensure db is provided.
 * @param {unknown} db Db.
 * @returns {void}
 */
function enforceDatabase(db) {
  if (!db) {
    throw new TypeError('db must be provided');
  }
}

/**
 * Apply update function with fallback.
 * @param {Function | undefined} updateVariantDirtyFn Update override.
 * @param {import('firebase-admin/firestore').DocumentReference} variantRef Variant ref.
 * @returns {Promise<void>} Promise.
 */
function applyUpdateFn(updateVariantDirtyFn, variantRef) {
  const updateFn = updateVariantDirtyFn ?? updateVariantDirty;
  return updateFn(variantRef);
}

/**
 * Extract the Authorization header from a request.
 * @param {NativeHttpRequest} req HTTP request.
 * @returns {string} Authorization header or empty string.
 */
/**
 * Send a 401 response with a message.
 * @param {NativeHttpResponse} res HTTP response.
 * @param {string} message Message to send.
 * @returns {void}
 */
export function sendUnauthorized(res, message) {
  res.status(401).send(message);
}

/**
 * Send a 403 Forbidden response.
 * @param {NativeHttpResponse} res HTTP response.
 * @returns {void}
 */
export function sendForbidden(res) {
  res.status(403).send('Forbidden');
}

/**
 * Ensure the incoming request uses the allowed HTTP method.
 * @param {NativeHttpRequest} req HTTP request.
 * @param {NativeHttpResponse} res HTTP response.
 * @param {string} allowedMethod Allowed HTTP method.
 * @returns {boolean} True when the method is allowed.
 */
function enforceAllowedMethod(req, res, allowedMethod) {
  if (getRequestMethod(req) === allowedMethod) {
    return true;
  }

  res.status(405).send(`${allowedMethod} only`);
  return false;
}

/**
 * Parse and validate the incoming request body.
 * @param {NativeHttpRequest} req HTTP request.
 * @param {NativeHttpResponse} res HTTP response.
 * @param {(body: unknown) => { pageNumber: number, variantName: string }} parseRequestBody Body parser.
 * @returns {{ pageNumber: number, variantName: string } | null} Parsed parameters or null when invalid.
 */
function parseValidRequest(req, res, parseRequestBody) {
  const parsed = parseRequestBody(getRequestBody(req));
  if (!isValidMarkRequest(parsed)) {
    res.status(400).json({ error: 'Invalid input' });
    return null;
  }

  return parsed;
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
 * Access the HTTP method from the request, if present.
 * @param {NativeHttpRequest | undefined} req Express request.
 * @returns {string | undefined} HTTP method or `undefined`.
 */
function getRequestMethod(req) {
  const method = getRequestProperty(req, 'method');
  if (typeof method === 'string') {
    return method;
  }
  return undefined;
}

/**
 * Validate that the parsed request contains numeric page and variant values.
 * @param {{ pageNumber?: unknown, variantName?: unknown }} payload Parsed body result.
 * @returns {boolean} True when the page number and variant name are valid.
 */
function isValidMarkRequest({ pageNumber, variantName }) {
  if (!Number.isInteger(pageNumber)) {
    return false;
  }

  return Boolean(variantName);
}

/**
 * Mark the variant dirty and send the appropriate response.
 * @param {MarkVariantAndRespondParams} params - Response and mutation dependencies.
 * @returns {Promise<void>} Resolves when the response has been sent.
 */
async function markVariantAndRespond({ res, markFn, pageNumber, variantName }) {
  await runWithFailureAndThen(
    () => markFn(pageNumber, variantName),
    error => {
      const message = resolveUpdateErrorMessage(error);
      res.status(500).json({ error: message });
    },
    value => {
      respondToVariantResult(res, value);
    }
  );
}

/**
 * Send the response for the variant update result.
 * @param {NativeHttpResponse} res Response object.
 * @param {boolean} ok Marker of success.
 * @returns {void}
 */
function respondToVariantResult(res, ok) {
  if (!ok) {
    res.status(404).json({ error: 'Variant not found' });
    return;
  }

  sendOkResponse(res);
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
 * Create a predicate that checks whether a decoded token matches the admin UID.
 * @param {string} adminUid Authorized admin UID.
 * @returns {(decoded: import('firebase-admin/auth').DecodedIdToken) => boolean} Admin check predicate.
 */
export function createIsAdminUid(adminUid) {
  return decoded => decoded?.uid === adminUid;
}

/**
 * Parse the request body for mark-variant-dirty.
 * @param {unknown} body Request body candidate.
 * @returns {MarkVariantRequestParams} Parsed parameters.
 */
export function parseMarkVariantRequestBody(body) {
  const parsed = /** @type {Record<string, unknown> | null | undefined} */ (
    body
  );
  const { page, variant } = parsed ?? {};
  return {
    pageNumber: Number(page),
    variantName: resolveVariantName(variant),
  };
}

/**
 * Resolve the variant name from the incoming payload.
 * @param {unknown} candidate Candidate variant identifier.
 * @returns {string} Variant name or empty string.
 */
function resolveVariantName(candidate) {
  const candidateStr = /** @type {string | undefined} */ (
    ensureString(candidate)
  );
  return candidateStr ?? '';
}

/**
 * Factory for the HTTP handler wrapping the mark-variant-dirty implementation.
 * @param {HandleRequestOptions} [options] Configuration for the handler.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse, deps?: HandleRequestDeps) => Promise<void>} Express request handler.
 */
export function createHandleRequest(options) {
  const optionsTyped = /** @type {HandleRequestOptions | undefined} */ (
    options
  );
  const { verifyAdmin, markVariantDirty } = optionsTyped ?? {};
  const parseRequestBody = resolveParseRequestBody(
    optionsTyped?.parseRequestBody
  );
  const allowedMethod = resolveAllowedMethod(optionsTyped?.allowedMethod);

  assertFunction(verifyAdmin, 'verifyAdmin');
  assertFunction(markVariantDirty, 'markVariantDirty');

  // After assertFunction calls, these are guaranteed to be functions
  const verifyAdminFn =
    /** @type {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} */ (
      verifyAdmin
    );
  const markVariantDirtyFn =
    /** @type {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} */ (
      markVariantDirty
    );

  return buildHandleRequest({
    verifyAdmin: verifyAdminFn,
    markVariantDirty: markVariantDirtyFn,
    parseRequestBody,
    allowedMethod,
  });
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
  return stringOrDefault(method, POST_METHOD);
}

/**
 * Build the HTTP handler once the inputs are normalized.
 * @param {HandlerDependencies} handlerDeps Normalized handler dependencies.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse, deps?: HandleRequestDeps) => Promise<void>} Express request handler.
 */
function buildHandleRequest(handlerDeps) {
  return async function handleRequest(req, res, deps = {}) {
    const depsTyped = /** @type {HandleRequestDeps} */ (deps);
    return processHandleRequest({ req, res, deps: depsTyped }, handlerDeps);
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
  const { req, res, deps } = requestData;
  const { verifyAdmin, markVariantDirty, parseRequestBody, allowedMethod } =
    handlerDeps;
  const verifyAdminFn = pickVerifyAdminFn(verifyAdmin, deps);
  const markFn = pickMarkFn(markVariantDirty, deps);

  try {
    enforceMethodOrThrow(req, res, allowedMethod);
    await ensureAuthorizedOrThrow(verifyAdminFn, req, res);
    const { pageNumber, variantName } = parseRequestOrThrow(
      req,
      res,
      parseRequestBody
    );

    await markVariantAndRespond({
      res,
      markFn,
      pageNumber,
      variantName,
    });
  } catch (err) {
    handleProcessError(err);
  }
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
 * Pick verifyAdmin override.
 * @param {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} verifyAdmin Default verify.
 * @param {HandleRequestDeps | undefined} deps Deps.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} Verify fn.
 */
function pickVerifyAdminFn(verifyAdmin, deps) {
  const depsVerifyAdmin = deps?.verifyAdmin;
  if (typeof depsVerifyAdmin === 'function') {
    return depsVerifyAdmin;
  }

  return verifyAdmin;
}

/**
 * Pick markFn override.
 * @param {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} markVariantDirty Default mark.
 * @param {HandleRequestDeps | undefined} deps Deps.
 * @returns {(pageNumber: number, variantName: string, deps?: MarkVariantDirtyDeps) => Promise<boolean>} Mark fn.
 */
function pickMarkFn(markVariantDirty, deps) {
  const depsMarkFn = deps?.markFn;
  if (typeof depsMarkFn === 'function') {
    return depsMarkFn;
  }

  return markVariantDirty;
}

/**
 * Enforce method or throw sentinel.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @param {string} allowedMethod Allowed method.
 * @returns {void}
 */
function enforceMethodOrThrow(req, res, allowedMethod) {
  if (!enforceAllowedMethod(req, res, allowedMethod)) {
    throw REQUEST_HANDLED;
  }
}

/**
 * Ensure authorization or throw sentinel.
 * @param {Function} verifyAdminFn Verify fn.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @returns {Promise<void>} Promise.
 */
async function ensureAuthorizedOrThrow(verifyAdminFn, req, res) {
  const authorized = await verifyAdminFn(req, res);
  if (!authorized) {
    throw REQUEST_HANDLED;
  }
}

/**
 * Parse request or throw sentinel.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @param {(body: unknown) => { pageNumber: number, variantName: string }} parseRequestBody Parser.
 * @returns {{ pageNumber: number, variantName: string }} Parsed.
 */
function parseRequestOrThrow(req, res, parseRequestBody) {
  const parsed = parseValidRequest(req, res, parseRequestBody);
  if (!parsed) {
    throw REQUEST_HANDLED;
  }

  return parsed;
}
