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
import { runWithFailure } from '../response-utils.js';
const POST_METHOD = 'POST';
export { getAllowedOrigins } from '../allowed-origins.js';
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

  return getDocRef(snap.docs[0]);
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

  return doc.ref;
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

  return Boolean(doc.ref);
}

/**
 * Find a reference to the page document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {{
 *   findPagesSnap?: typeof findPagesSnap,
 *   refFromSnap?: typeof refFromSnap,
 * }} [firebase] Optional Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Page doc ref.
 */
export async function findPageRef(database, pageNumber, firebase = {}) {
  const findPagesSnapFn = chooseHelper(firebase.findPagesSnap, findPagesSnap);
  const refFromSnapFn = chooseHelper(firebase.refFromSnap, refFromSnap);

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
 * @param {{
 *   database: import('firebase-admin/firestore').Firestore,
 *   pageNumber: number,
 *   variantName: string,
 *   firebase?: {
 *     findPageRef?: typeof findPageRef,
 *     findPagesSnap?: typeof findPagesSnap,
 *     findVariantsSnap?: typeof findVariantsSnap,
 *     refFromSnap?: typeof refFromSnap,
 *   },
 * }} params - Dependencies used to locate the variant.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant doc ref.
 */
export async function findVariantRef({
  database,
  pageNumber,
  variantName,
  firebase = {},
}) {
  const helpers = resolveVariantHelpers(firebase);
  const pageRef = await helpers.findPageRef(database, pageNumber, {
    findPagesSnap: helpers.findPagesSnap,
    refFromSnap: helpers.refFromSnap,
  });

  return resolveVariantRefFromPage(helpers, pageRef, variantName);
}

/**
 * Resolve the variant reference when a page ref is present.
 * @param {object} helpers Firebase helpers.
 * @param {import('firebase-admin/firestore').DocumentReference | null} pageRef Page ref candidate.
 * @param {string} variantName Variant name.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant ref or null.
 */
function resolveVariantRefFromPage(helpers, pageRef, variantName) {
  if (!pageRef) {
    return null;
  }

  return findVariantRefFromPage(helpers, pageRef, variantName);
}

/**
 * Resolve variant helpers from overrides.
 * @param {object} firebase Firebase helpers.
 * @returns {object} Helpers.
 */
function resolveVariantHelpers(firebase) {
  return {
    findPageRef: chooseHelper(firebase.findPageRef, findPageRef),
    findVariantsSnap: chooseHelper(firebase.findVariantsSnap, findVariantsSnap),
    findPagesSnap: chooseHelper(firebase.findPagesSnap, findPagesSnap),
    refFromSnap: chooseHelper(firebase.refFromSnap, refFromSnap),
  };
}

/**
 * Choose helper override.
 * @param {unknown} override Override.
 * @param {Function} fallback Fallback.
 * @returns {Function} Helper.
 */
function chooseHelper(override, fallback) {
  if (typeof override === 'function') {
    return override;
  }

  return fallback;
}

/**
 * Find variant ref from page ref.
 * @param {object} helpers Helpers.
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
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   firebase?: {
 *     findPageRef?: typeof findPageRef,
 *     findPagesSnap?: typeof findPagesSnap,
 *     findVariantsSnap?: typeof findVariantsSnap,
 *     refFromSnap?: typeof refFromSnap,
 *   },
 *   updateVariantDirty?: typeof updateVariantDirty,
 * }} deps Dependencies required to locate and update the variant.
 * @returns {Promise<boolean>} True if the variant was updated.
 */
export async function markVariantDirtyImpl(pageNumber, variantName, deps = {}) {
  const variantRef = await resolveVariantReference(
    deps,
    pageNumber,
    variantName
  );

  return updateVariantIfPresent(deps.updateVariantDirty, variantRef);
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
 * @param {object} deps Dependencies required to resolve the variant.
 * @param {number} pageNumber Target page number.
 * @param {string} variantName Variant name to look up.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Resolved variant reference.
 */
async function resolveVariantReference(deps, pageNumber, variantName) {
  const { db, firebase = {} } = deps;

  enforceDatabase(db);

  return findVariantRef({
    database: db,
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
 * @param {import('express').Request} req HTTP request.
 * @returns {string} Authorization header or empty string.
 */
/**
 * Send a 401 response with a message.
 * @param {import('express').Response} res HTTP response.
 * @param {string} message Message to send.
 * @returns {void}
 */
export function sendUnauthorized(res, message) {
  res.status(401).send(message);
}

/**
 * Send a 403 Forbidden response.
 * @param {import('express').Response} res HTTP response.
 * @returns {void}
 */
export function sendForbidden(res) {
  res.status(403).send('Forbidden');
}

/**
 * Ensure the incoming request uses the allowed HTTP method.
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
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
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
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
 * @param {import('express').Request | undefined} req Express request.
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
 * @param {import('express').Request | undefined} req Express request.
 * @returns {unknown | undefined} Body payload or `undefined`.
 */
function getRequestBody(req) {
  return getRequestProperty(req, 'body');
}

/**
 * Access the HTTP method from the request, if present.
 * @param {import('express').Request | undefined} req Express request.
 * @returns {string | undefined} HTTP method or `undefined`.
 */
function getRequestMethod(req) {
  return getRequestProperty(req, 'method');
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
 * @param {{
 *   res: import('express').Response,
 *   markFn: (pageNumber: number, variantName: string) => Promise<boolean>,
 *   pageNumber: number,
 *   variantName: string,
 * }} params - Response and mutation dependencies.
 * @returns {Promise<void>} Resolves when the response has been sent.
 */
async function markVariantAndRespond({ res, markFn, pageNumber, variantName }) {
  const outcome = await runWithFailure(
    () => markFn(pageNumber, variantName),
    error => {
      const message = resolveUpdateErrorMessage(error);
      res.status(500).json({ error: message });
    }
  );
  if (!outcome.ok) {
    return;
  }

  respondToVariantResult(res, outcome.value);
}

/**
 * Send the response for the variant update result.
 * @param {import('express').Response} res Response object.
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
 * @returns {{ pageNumber: number, variantName: string }} Parsed parameters.
 */
export function parseMarkVariantRequestBody(body) {
  const { page, variant } = body ?? {};
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
  return ensureString(candidate);
}

/**
 * Factory for the HTTP handler wrapping the mark-variant-dirty implementation.
 * @param {object} options Configuration for the handler.
 * @param {(req: import('express').Request, res: import('express').Response) => Promise<boolean>} options.verifyAdmin Admin verification helper.
 * @param {(pageNumber: number, variantName: string, deps?: object) => Promise<boolean>} options.markVariantDirty Core mutation helper.
 * @param {(body: unknown) => { pageNumber: number, variantName: string }} [options.parseRequestBody] Body parser.
 * @param {string} [options.allowedMethod] Allowed HTTP method.
 * @returns {(req: import('express').Request, res: import('express').Response, deps?: { markFn?: typeof markVariantDirtyImpl, verifyAdmin?: typeof options.verifyAdmin }) => Promise<void>} Express request handler.
 */
export function createHandleRequest(options = {}) {
  const { verifyAdmin, markVariantDirty } = options;
  const parseRequestBody = resolveParseRequestBody(options.parseRequestBody);
  const allowedMethod = resolveAllowedMethod(options.allowedMethod);

  assertFunction(verifyAdmin, 'verifyAdmin');
  assertFunction(markVariantDirty, 'markVariantDirty');

  return buildHandleRequest({
    verifyAdmin,
    markVariantDirty,
    parseRequestBody,
    allowedMethod,
  });
}

/**
 * Resolve the parser to use for incoming requests.
 * @param {Function | undefined} parser Candidate parser.
 * @returns {Function} Body parser.
 */
function resolveParseRequestBody(parser) {
  if (typeof parser === 'function') {
    return parser;
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
 * @param {object} handlerDeps Normalized handler dependencies.
 * @param {Function} handlerDeps.verifyAdmin Admin check.
 * @param {Function} handlerDeps.markVariantDirty Variant mutation helper.
 * @param {Function} handlerDeps.parseRequestBody Body parser.
 * @param {string} handlerDeps.allowedMethod Allowed HTTP method.
 * @returns {(req: import('express').Request, res: import('express').Response, deps?: { markFn?: typeof markVariantDirtyImpl, verifyAdmin?: typeof handlerDeps.verifyAdmin }) => Promise<void>} Express request handler.
 */
function buildHandleRequest(handlerDeps) {
  return async function handleRequest(req, res, deps = {}) {
    return processHandleRequest({ req, res, deps }, handlerDeps);
  };
}

export { getRequestBody, getRequestMethod, hasStringMessage };

const REQUEST_HANDLED = Symbol('request-handled');

/**
 * Core handler workflow that validates the request, authorizes the caller, and marks the variant dirty.
 * @param {object} requestData Request lifecycle dependencies.
 * @param {import('express').Request} requestData.req Express request.
 * @param {import('express').Response} requestData.res Express response.
 * @param {object} requestData.deps Optional overrides.
 * @param {object} handlerDeps Handler dependencies.
 * @param {Function} handlerDeps.verifyAdmin Admin verification function.
 * @param {Function} handlerDeps.markVariantDirty Variant mutation helper.
 * @param {(body: unknown) => { pageNumber: number, variantName: string }} handlerDeps.parseRequestBody Request parser.
 * @param {string} handlerDeps.allowedMethod Allowed HTTP method.
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
 * @param {Function} verifyAdmin Default verify.
 * @param {object} deps Deps.
 * @returns {Function} Verify fn.
 */
function pickVerifyAdminFn(verifyAdmin, deps) {
  if (typeof deps.verifyAdmin === 'function') {
    return deps.verifyAdmin;
  }

  return verifyAdmin;
}

/**
 * Pick markFn override.
 * @param {Function} markVariantDirty Default mark.
 * @param {object} deps Deps.
 * @returns {Function} Mark fn.
 */
function pickMarkFn(markVariantDirty, deps) {
  if (typeof deps.markFn === 'function') {
    return deps.markFn;
  }

  return markVariantDirty;
}

/**
 * Enforce method or throw sentinel.
 * @param {import('express').Request} req Req.
 * @param {import('express').Response} res Res.
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
 * @param {import('express').Request} req Req.
 * @param {import('express').Response} res Res.
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
 * @param {import('express').Request} req Req.
 * @param {import('express').Response} res Res.
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
