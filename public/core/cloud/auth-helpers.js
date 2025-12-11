import { matchBearerToken } from './cloud-core.js';
import { stringOrNull } from '../common-core.js';

/**
 * Normalize an Authorization header candidate into a string.
 * @param {unknown} header Header value.
 * @returns {string} String representation of the header or empty string.
 */
function normalizeHeaderString(header) {
  if (typeof header === 'string') {
    return header;
  }

  return '';
}

/**
 * Default UID extractor that simply returns the decoded `uid` when available.
 * @param {{ uid?: string | null } | null | undefined} decoded Decoded token.
 * @returns {string | null} UID string when present, otherwise null.
 */
function defaultUidMapper(decoded) {
  return stringOrNull(decoded?.uid);
}

/**
 * Safely verify the passed-in token and map the decoded payload.
 * @param {string} token Token string to verify.
 * @param {(token: string) => Promise<{ uid?: string | null } | null | undefined>} verifyIdToken Verifier.
 * @param {(decoded: { uid?: string | null } | null | undefined) => string | null} mapDecoded Function that resolves the decoded token to a UID.
 * @returns {Promise<string | null>} UID when verification succeeds, otherwise null.
 */
export function verifyTokenSafe(
  token,
  verifyIdToken,
  mapDecoded = defaultUidMapper
) {
  return verifyIdToken(token)
    .then(decoded => mapDecoded(decoded))
    .catch(() => null);
}

/**
 * Resolve the author identifier from an Authorization header.
 * @param {unknown} header Authorization header candidate.
 * @param {(token: string) => Promise<{ uid?: string | null } | null | undefined>} verifyIdToken Token verifier.
 * @param {(decoded: { uid?: string | null } | null | undefined) => string | null} [mapDecoded] Optional mapper for the decoded token.
 * @returns {Promise<string | null>} UID when verification succeeds, otherwise null.
 */
export function resolveAuthorIdFromHeader(header, verifyIdToken, mapDecoded) {
  const token = matchBearerToken(normalizeHeaderString(header));
  if (!token) {
    return Promise.resolve(null);
  }

  return verifyTokenSafe(token, verifyIdToken, mapDecoded);
}
