export { DEFAULT_BUCKET_NAME } from './common-core.js';

/**
 * Ensure a candidate dependency is callable before using it.
 * @param {unknown} candidate Value being validated.
 * @param {string} name Name of the dependency for error reporting.
 * @returns {void}
 */
export function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Normalize a textual input into a trimmed string bounded by the provided length.
 * @param {unknown} value Raw value supplied by the client.
 * @param {number} maxLength Maximum number of characters allowed in the normalized result.
 * @returns {string} Normalized string respecting the requested length.
 */
export function normalizeString(value, maxLength) {
  if (typeof value !== 'string') {
    value = normalizeNonStringValue(value);
  }

  return value.trim().slice(0, maxLength);
}

/**
 * Convert non-string values into a working string.
 * @param {unknown} value Candidate value normalized by `normalizeString`.
 * @returns {string} Converted string, empty when the value is nullish.
 */
function normalizeNonStringValue(value) {
  if (isNullish(value)) {
    return '';
  }

  return String(value);
}

/**
 * Check whether a value is `null` or `undefined`.
 * @param {unknown} value Candidate value to inspect.
 * @returns {boolean} True when the input is nullish.
 */
function isNullish(value) {
  return value === undefined || value === null;
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
 * Extract the Authorization header from a request.
 * @param {import('express').Request} req Incoming HTTP request.
 * @returns {string} Authorization header or an empty string.
 */
export function getAuthHeader(req) {
  return normalizeAuthorizationValue(resolveAuthorizationHeader(req));
}

/**
 * Normalize the Authorization header so the caller always receives a string.
 * @param {unknown} value Header value extracted from the request.
 * @returns {string} Header text or empty string when missing or invalid.
 */
function normalizeAuthorizationValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value;
}

/**
 * Safely resolve the Authorization header from the request getter.
 * @param {import('express').Request} req HTTP request object.
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
 * Build a human-friendly invalid token message.
 * @param {unknown} error Validation error.
 * @returns {string} Message sent to clients when token validation fails.
 */
function defaultInvalidTokenMessage(error) {
  const candidate = error?.message;
  return ['Invalid token', candidate][Number(typeof candidate === 'string')];
}

/**
 * Extract the bearer token string from the request.
 * @param {import('express').Request} req Incoming HTTP request.
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
 *   sendUnauthorized: (res: import('express').Response, message: string) => void,
 *   sendForbidden: (res: import('express').Response) => void,
 *   res: import('express').Response,
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
 *   sendForbidden: (res: import('express').Response) => void,
 *   res: import('express').Response,
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
 * @param {(res: import('express').Response, message: string) => void} deps.sendUnauthorized Sends 401 responses.
 * @param {(res: import('express').Response) => void} deps.sendForbidden Sends 403 responses.
 * @returns {(req: import('express').Request, res: import('express').Response) => Promise<boolean>} Express middleware that authenticates the admin request and reports success.
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
