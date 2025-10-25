const defaultMissingTokenMessage = 'Missing token';

/**
 * Determine whether a request exposes a header getter helper.
 * @param {import('express').Request | { get?: (header: string) => string | undefined } | null | undefined} req
 *   Incoming request supplying header access helpers.
 * @returns {req is { get: (header: string) => string | undefined }} True when the request can read headers.
 */
function hasHeaderGetter(req) {
  return typeof req?.get === 'function';
}

/**
 * Read the Authorization header from a request guaranteed to support header lookups.
 * @param {{ get: (header: string) => string | undefined }} req Request supporting the Express get helper.
 * @returns {string} Authorization header value or an empty string when unavailable.
 */
function readAuthorizationHeader(req) {
  const header = req.get('Authorization');

  if (typeof header === 'string') {
    return header;
  }

  return '';
}

/**
 * Retrieve the Authorization header from a request-like object.
 * @param {import('express').Request | { get?: (header: string) => string | undefined } | null | undefined} req
 *   Incoming request supplying header access helpers.
 * @returns {string} Authorization header value or an empty string when unavailable.
 */
function defaultGetAuthHeader(req) {
  if (!hasHeaderGetter(req)) {
    return '';
  }

  return readAuthorizationHeader(req);
}

/**
 * Parse a bearer token from an Authorization header value.
 * @param {string} authHeader Raw Authorization header string.
 * @returns {string[] | null} Match result where index 1 holds the bearer token.
 */
function defaultMatchAuthHeader(authHeader) {
  return authHeader.match(/^Bearer (.+)$/);
}

/**
 * Produce a human-friendly message for token verification failures.
 * @param {unknown} error Error thrown during token validation.
 * @returns {string} Message describing the failure.
 */
function defaultInvalidTokenMessage(error) {
  const candidate = error?.message;

  return ['Invalid token', candidate][Number(typeof candidate === 'string')];
}

/**
 * Create a verifyAdmin function with dependency injection.
 * @param {object} deps Collaborators for verification flow.
 * @param {(req: import('express').Request) => string} [deps.getAuthHeader] Extract Authorization header.
 * @param {(authHeader: string) => string[] | null} [deps.matchAuthHeader] Parse bearer token.
 * @param {(token: string) => Promise<import('firebase-admin/auth').DecodedIdToken>} deps.verifyToken Verify token.
 * @param {(decoded: import('firebase-admin/auth').DecodedIdToken) => boolean} deps.isAdminUid Determine admin access.
 * @param {(res: import('express').Response, message: string) => void} deps.sendUnauthorized Send 401 response.
 * @param {(res: import('express').Response) => void} deps.sendForbidden Send 403 response.
 * @param {string} [deps.missingTokenMessage] Message when Authorization header absent.
 * @param {(error: unknown) => string} [deps.getInvalidTokenMessage] Message for invalid tokens.
 * @returns {(req: import('express').Request, res: import('express').Response) => Promise<boolean>} Verify admin handler.
 */
export function createVerifyAdmin({
  getAuthHeader = defaultGetAuthHeader,
  matchAuthHeader = defaultMatchAuthHeader,
  verifyToken,
  isAdminUid,
  sendUnauthorized,
  sendForbidden,
  missingTokenMessage = defaultMissingTokenMessage,
  getInvalidTokenMessage = defaultInvalidTokenMessage,
} = {}) {
  if (typeof verifyToken !== 'function') {
    throw new TypeError('verifyToken must be provided');
  }
  if (typeof isAdminUid !== 'function') {
    throw new TypeError('isAdminUid must be provided');
  }
  if (typeof sendUnauthorized !== 'function') {
    throw new TypeError('sendUnauthorized must be provided');
  }
  if (typeof sendForbidden !== 'function') {
    throw new TypeError('sendForbidden must be provided');
  }

  return async function verifyAdmin(req, res) {
    const authHeader = getAuthHeader(req);
    const match = matchAuthHeader(authHeader);
    const token = match?.[1] || '';
    if (!token) {
      sendUnauthorized(res, missingTokenMessage);
      return false;
    }

    try {
      const decoded = await verifyToken(token);
      const isAdmin = Boolean(isAdminUid(decoded));
      if (!isAdmin) {
        sendForbidden(res);
        return false;
      }
    } catch (error) {
      const message =
        getInvalidTokenMessage(error) || defaultInvalidTokenMessage(error);
      sendUnauthorized(res, message);
      return false;
    }

    return true;
  };
}
