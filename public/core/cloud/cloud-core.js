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
  return req?.get?.('Authorization') || '';
}

/**
 * Parse a bearer token from an Authorization header.
 * @param {string} authHeader Authorization header string.
 * @returns {string[] | null} Matches capturing the bearer token.
 */
export function matchAuthHeader(authHeader) {
  return authHeader.match(/^Bearer (.+)$/);
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
 * Create a reusable admin guard.
 * @param {object} deps Authorization collaborators.
 * @param {(token: string) => Promise<import('firebase-admin/auth').DecodedIdToken>} deps.verifyToken Token validator.
 * @param {(decoded: import('firebase-admin/auth').DecodedIdToken) => boolean} deps.isAdminUid Admin UID checker.
 * @param {(res: import('express').Response, message: string) => void} deps.sendUnauthorized Sends 401 responses.
 * @param {(res: import('express').Response) => void} deps.sendForbidden Sends 403 responses.
 * @param {string} [deps.missingTokenMessage] Message when the Authorization header is missing.
 * @param {(error: unknown) => string} [deps.getInvalidTokenMessage] Custom invalid token message.
 * @returns {(req: import('express').Request, res: import('express').Response) => Promise<boolean>} Express middleware that authenticates the admin request and reports success.
 */
export function createVerifyAdmin({
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
