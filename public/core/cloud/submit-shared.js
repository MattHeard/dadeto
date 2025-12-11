import { normalizeShortString } from './cloud-core.js';
import { resolveAuthorIdFromHeader } from './auth-helpers.js';

/**
 * Normalize the short text submitted by callers (title, option, page markers, etc.).
 * @param {unknown} value Candidate value supplied by the request.
 * @returns {string} Trimmed string limited to the short-field length.
 */
function normalizeShortSubmissionString(value) {
  return normalizeShortString(value);
}

export {
  normalizeShortSubmissionString as normalizeShortString,
  resolveAuthorIdFromHeader,
};
