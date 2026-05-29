/**
 * @param {unknown} value Candidate object.
 * @returns {value is Record<string, unknown>} True when the value is an object record.
 */
export function isObjectLike(value) {
  return typeof value === 'object' && Boolean(value);
}

/**
 * @param {unknown} value Candidate string.
 * @returns {string | null} String or null.
 */
export function asNullableString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  return value;
}

/**
 * @param {unknown} value Candidate source.
 * @returns {Record<string, unknown>} Source object or empty object.
 */
export function toSourceObject(value) {
  if (isObjectLike(value)) {
    return value;
  }

  return {};
}

/**
 * @param {unknown} value Candidate string.
 * @param {string} fallback Fallback value.
 * @returns {string} String or fallback.
 */
export function asStringWithFallback(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value;
}
