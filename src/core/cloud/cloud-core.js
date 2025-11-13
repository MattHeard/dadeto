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
