/**
 * Returns `value` unless it is `undefined`, otherwise returns `fallback`.
 * @param {*} value - Value to check.
 * @param {*} fallback - Value to return when `value` is undefined.
 * @returns {*} Either `value` or `fallback`.
 */
export function valueOr(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  return value;
}
