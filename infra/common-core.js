/**
 * Default storage bucket used for production content.
 * Shared so non-Cloud systems can mirror the same configuration.
 */
export const DEFAULT_BUCKET_NAME = 'www.dendritestories.co.nz';

/**
 * UID for the admin user with elevated access.
 */
export const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';

/**
 * Checks if a string is non-empty.
 * @param {string} str - Candidate string to validate.
 * @returns {boolean} True when the input is a non-empty string.
 */
export function isValidString(str) {
  return typeof str === 'string' && str.length > 0;
}

/**
 * Detects whether a value is `null` or `undefined`.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the input is nullish.
 */
export function isNullish(value) {
  return value === undefined || value === null;
}

/**
 * Determines whether a value is an object that is not null.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is an object and not null.
 */
export function isNonNullObject(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Ensure a dependency is callable.
 * @param {unknown} candidate Candidate value.
 * @param {string} name Name used in the error message.
 * @returns {void}
 */
export function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Return the string candidate when available.
 * @param {unknown} value Candidate value.
 * @returns {string | undefined} String when provided, otherwise undefined.
 */
function getStringCandidate(value) {
  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

/**
 * Apply a fallback when the string candidate doesn't meet the acceptance predicate.
 * @param {unknown} value Candidate value.
 * @param {() => string | null} fallback Fallback result supplier.
 * @param {(normalized: string | undefined) => boolean} isNormalizedAcceptable Predicate indicating when the normalized string should be returned.
 * @returns {string | null} Normalized string or fallback.
 */
function withStringFallback(value, fallback, isNormalizedAcceptable) {
  const normalized = getStringCandidate(value);
  if (isNormalizedAcceptable(normalized)) {
    return normalized;
  }

  return fallback();
}

/**
 * Returns the input string when available; otherwise returns an empty string.
 * @param {unknown} value Candidate value.
 * @returns {string} Input string or empty fallback.
 */
export function ensureString(value) {
  const normalized = stringOrNull(value);
  if (normalized !== null) {
    return normalized;
  }

  return '';
}

/**
 * Return the provided string when available; otherwise use the fallback.
 * @param {unknown} value Candidate value that may be a string.
 * @param {string} fallback Replacement when the value is not a string.
 * @returns {string} String value or fallback.
 */
export function stringOrDefault(value, fallback) {
  return withStringFallback(
    value,
    () => fallback,
    normalized => normalized !== undefined
  );
}

/**
 * Converts a non-string value into a string, defaulting to empty when nullish.
 * @param {unknown} value Candidate value.
 * @returns {string} Safe string representation.
 */
export function normalizeNonStringValue(value) {
  if (isNullish(value)) {
    return '';
  }

  return String(value);
}

/**
 * Return the input when it is a string; otherwise `null`.
 * @param {unknown} value Candidate value.
 * @returns {string | null} String when provided, otherwise `null`.
 */
export function stringOrNull(value) {
  const normalized = getStringCandidate(value);
  if (normalized !== undefined) {
    return normalized;
  }

  return null;
}

/**
 * Return the provided string when available or delegate to a fallback.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => string | null} fallback Function invoked when the value is not a string.
 * @returns {string | null} String from the value or fallback.
 */
export function stringOrFallback(value, fallback) {
  return withStringFallback(
    value,
    () => fallback(value),
    normalized => Boolean(normalized)
  );
}
