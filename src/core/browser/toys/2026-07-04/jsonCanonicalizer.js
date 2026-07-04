/**
 * Convert a JSON string into stable, pretty-printed canonical JSON.
 * @param {string} input JSON payload string.
 * @returns {string} Canonicalized JSON string or structured error JSON.
 */
export function jsonCanonicalizer(input) {
  try {
    return JSON.stringify(canonicalizeValue(JSON.parse(input)), null, 2);
  } catch {
    return JSON.stringify({
      error: 'Invalid JSON input: malformed JSON',
    });
  }
}

/**
 * Canonicalize a parsed JSON value recursively.
 * @param {unknown} value Parsed JSON value.
 * @returns {unknown} Canonicalized JSON value.
 */
function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }

  if (isPlainObject(value)) {
    return canonicalizeObject(/** @type {Record<string, unknown>} */ (value));
  }

  return value;
}

/**
 * Canonicalize an object by sorting keys and recursively canonicalizing values.
 * @param {Record<string, unknown>} value Object to canonicalize.
 * @returns {Record<string, unknown>} Canonical object.
 */
function canonicalizeObject(value) {
  return Object.keys(value)
    .sort()
    .reduce((record, key) => {
      record[key] = canonicalizeValue(value[key]);
      return record;
    }, /** @type {Record<string, unknown>} */ ({}));
}

/**
 * Check whether a value is a plain object.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when the value is a plain object.
 */
function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
