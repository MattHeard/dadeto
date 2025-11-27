import { productionOrigins } from '../cloud-core.js';

const POST_METHOD = 'POST';
const TEST_ENV_PREFIX = 't-';

/**
 * Derive the set of allowed origins for the admin endpoint.
 * @param {Record<string, unknown> | null | undefined} environmentVariables Environment configuration.
 * @returns {string[]} Whitelisted origins.
 */
export function getAllowedOrigins(environmentVariables) {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  if (isProdEnvironment(environment)) {
    return productionOrigins;
  }

  if (isTestEnvironment(environment)) {
    return resolvePlaywrightOrigin(environmentVariables?.PLAYWRIGHT_ORIGIN);
  }

  return productionOrigins;
}

/**
 * Detect whether the current environment should use the production origins.
 * @param {unknown} environment Raw environment label.
 * @returns {environment is string} True when the label is exactly `prod`.
 */
function isProdEnvironment(environment) {
  return environment === 'prod';
}

/**
 * Detect whether the environment label indicates a Playwright test run.
 * @param {unknown} environment Raw environment label.
 * @returns {environment is string} True when the label starts with the test prefix.
 */
function isTestEnvironment(environment) {
  return (
    typeof environment === 'string' && environment.startsWith(TEST_ENV_PREFIX)
  );
}

/**
 * Resolve the Playwright origin when provided.
 * @param {unknown} origin Candidate override.
 * @returns {string[]} Either a singleton list or an empty array.
 */
function resolvePlaywrightOrigin(origin) {
  if (typeof origin === 'string' && origin) {
    return [origin];
  }
  return [];
}

export { getAuthHeader, matchAuthHeader } from '../cloud-core.js';
/**
 * Determine whether an origin is permitted.
 * @param {string | null | undefined} origin Request origin header.
 * @param {string[]} allowedOrigins Whitelisted origins.
 * @returns {boolean} True when the origin is allowed.
 */
export function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Build the cors middleware origin handler.
 * @param {(origin: string | null | undefined, origins: string[]) => boolean} isAllowedOriginFn Origin predicate.
 * @param {string[]} allowedOrigins Whitelisted origins.
 * @returns {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} Express CORS origin handler.
 */
export function createHandleCorsOrigin(isAllowedOriginFn, allowedOrigins) {
  if (typeof isAllowedOriginFn !== 'function') {
    throw new TypeError('isAllowedOrigin must be a function');
  }

  return (origin, cb) => {
    if (isAllowedOriginFn(origin ?? null, allowedOrigins)) {
      cb(null, true);
      return;
    }

    cb(new Error('CORS'));
  };
}

/**
 * Compose the CORS middleware configuration.
 * @param {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} handleCorsOrigin Origin handler.
 * @param {string[]} [methods] Allowed HTTP methods. Defaults to an array containing the POST method.
 * @returns {{ origin: typeof handleCorsOrigin, methods: string[] }} Express CORS configuration.
 */
export function createCorsOptions(handleCorsOrigin, methods = [POST_METHOD]) {
  if (typeof handleCorsOrigin !== 'function') {
    throw new TypeError('handleCorsOrigin must be a function');
  }

  return {
    origin: handleCorsOrigin,
    methods,
  };
}

/**
 * Find pages snapshot for a page number.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Pages snapshot.
 */
export function findPagesSnap(database, pageNumber) {
  return database
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
}

/**
 * Extract a document reference from a query snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap Query snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document ref.
 */
export function refFromSnap(snap) {
  return snap?.docs?.[0]?.ref || null;
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
  const findPagesSnapFn = firebase.findPagesSnap ?? findPagesSnap;
  const refFromSnapFn = firebase.refFromSnap ?? refFromSnap;

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
  return pageRef
    .collection('variants')
    .where('name', '==', variantName)
    .limit(1)
    .get();
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
    findPageRef: firebase.findPageRef ?? findPageRef,
    findVariantsSnap: firebase.findVariantsSnap ?? findVariantsSnap,
    findPagesSnap: firebase.findPagesSnap ?? findPagesSnap,
    refFromSnap: firebase.refFromSnap ?? refFromSnap,
  };
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
  const { db, firebase = {}, updateVariantDirty: updateVariantDirtyFn } = deps;

  enforceDatabase(db);

  const variantRef = await findVariantRef({
    database: db,
    pageNumber,
    variantName,
    firebase,
  });

  if (!variantRef) {
    return false;
  }

  const updateFn = updateVariantDirtyFn ?? updateVariantDirty;
  await updateFn(variantRef);

  return true;
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
  if (req?.method === allowedMethod) {
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
  const { pageNumber, variantName } = parseRequestBody(req?.body);

  if (Number.isInteger(pageNumber) && variantName) {
    return { pageNumber, variantName };
  }

  res.status(400).json({ error: 'Invalid input' });
  return null;
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
  try {
    const ok = await markFn(pageNumber, variantName);
    if (!ok) {
      res.status(404).json({ error: 'Variant not found' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    const message = resolveUpdateErrorMessage(error);
    res.status(500).json({ error: message });
  }
}

/**
 * Normalize the error message for variant update failures.
 * @param {unknown} error Error thrown while marking a variant dirty.
 * @returns {string} Message that can be surfaced to the client.
 */
function resolveUpdateErrorMessage(error) {
  if (typeof error?.message === 'string') {
    return error.message;
  }

  return 'update failed';
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
  const pageNumber = Number(body?.page);
  let variantName = '';
  if (typeof body?.variant === 'string') {
    variantName = body.variant;
  }

  return { pageNumber, variantName };
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
export function createHandleRequest({
  verifyAdmin,
  markVariantDirty,
  parseRequestBody = parseMarkVariantRequestBody,
  allowedMethod = POST_METHOD,
}) {
  if (typeof verifyAdmin !== 'function') {
    throw new TypeError('verifyAdmin must be a function');
  }
  if (typeof markVariantDirty !== 'function') {
    throw new TypeError('markVariantDirty must be a function');
  }

  return async function handleRequest(req, res, deps = {}) {
    return processHandleRequest({
      req,
      res,
      deps,
      verifyAdmin,
      markVariantDirty,
      parseRequestBody,
      allowedMethod,
    });
  };
}

const REQUEST_HANDLED = Symbol('request-handled');

/**
 * Process handleRequest with reduced branching.
 * @param {object} params Params.
 * @param params.req
 * @param params.res
 * @param params.deps
 * @param params.verifyAdmin
 * @param params.markVariantDirty
 * @param params.parseRequestBody
 * @param params.allowedMethod
 * @returns {Promise<void>} Promise.
 */
async function processHandleRequest({
  req,
  res,
  deps,
  verifyAdmin,
  markVariantDirty,
  parseRequestBody,
  allowedMethod,
}) {
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
    if (err === REQUEST_HANDLED) {
      return;
    }
    throw err;
  }
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
