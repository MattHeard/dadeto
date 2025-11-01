import { productionOrigins } from './cloud-core.js';

export { createVerifyAdmin } from './verifyAdmin.js';

const POST_METHOD = 'POST';

/**
 * Derive the set of allowed origins for the admin endpoint.
 * @param {Record<string, unknown> | null | undefined} environmentVariables Environment configuration.
 * @returns {string[]} Whitelisted origins.
 */
export function getAllowedOrigins(environmentVariables) {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    return typeof playwrightOrigin === 'string' && playwrightOrigin
      ? [playwrightOrigin]
      : [];
  }

  return productionOrigins;
}

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
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {{
 *   findPageRef?: typeof findPageRef,
 *   findPagesSnap?: typeof findPagesSnap,
 *   findVariantsSnap?: typeof findVariantsSnap,
 *   refFromSnap?: typeof refFromSnap,
 * }} [firebase] Optional Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant doc ref.
 */
export async function findVariantRef(
  database,
  pageNumber,
  variantName,
  firebase = {}
) {
  const findPageRefFn = firebase.findPageRef ?? findPageRef;
  const findVariantsSnapFn = firebase.findVariantsSnap ?? findVariantsSnap;
  const findPagesSnapFn = firebase.findPagesSnap ?? findPagesSnap;
  const refFromSnapFn = firebase.refFromSnap ?? refFromSnap;

  const pageRef = await findPageRefFn(database, pageNumber, {
    findPagesSnap: findPagesSnapFn,
    refFromSnap: refFromSnapFn,
  });

  if (!pageRef) {
    return null;
  }

  const variantsSnap = await findVariantsSnapFn(pageRef, variantName);
  return refFromSnapFn(variantsSnap);
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

  if (!db) {
    throw new TypeError('db must be provided');
  }

  const variantRef = await findVariantRef(
    db,
    pageNumber,
    variantName,
    firebase
  );

  if (!variantRef) {
    return false;
  }

  const updateFn = updateVariantDirtyFn ?? updateVariantDirty;
  await updateFn(variantRef);

  return true;
}

/**
 * Extract the Authorization header from a request.
 * @param {import('express').Request} req HTTP request.
 * @returns {string} Authorization header or empty string.
 */
export function getAuthHeader(req) {
  return req?.get?.('Authorization') || '';
}

/**
 * Match a bearer token from an Authorization header.
 * @param {string} authHeader Authorization header.
 * @returns {string[] | null} Match result capturing the bearer token components.
 */
export function matchAuthHeader(authHeader) {
  return authHeader.match(/^Bearer (.+)$/);
}

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
 * @param {import('express').Response} res HTTP response.
 * @param {(pageNumber: number, variantName: string) => Promise<boolean>} markFn Mutation helper.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @returns {Promise<void>} Resolves when the response has been sent.
 */
async function markVariantAndRespond(res, markFn, pageNumber, variantName) {
  try {
    const ok = await markFn(pageNumber, variantName);
    if (!ok) {
      res.status(404).json({ error: 'Variant not found' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    const message =
      typeof error?.message === 'string' ? error.message : 'update failed';
    res.status(500).json({ error: message });
  }
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
  const variantName = typeof body?.variant === 'string' ? body.variant : '';

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
    if (!enforceAllowedMethod(req, res, allowedMethod)) {
      return;
    }

    const verifyAdminFn =
      typeof deps.verifyAdmin === 'function' ? deps.verifyAdmin : verifyAdmin;

    if (!(await verifyAdminFn(req, res))) {
      return;
    }

    const parsed = parseValidRequest(req, res, parseRequestBody);
    if (!parsed) {
      return;
    }

    const markFn =
      typeof deps.markFn === 'function' ? deps.markFn : markVariantDirty;

    await markVariantAndRespond(
      res,
      markFn,
      parsed.pageNumber,
      parsed.variantName
    );
  };
}
