/**
 * Creates a shallow copy of an object with only the specified keys
 * @param {Object} obj - The source object
 * @param {string[]} keys - The keys to include in the new object
 * @returns {Object} A new object with only the specified keys
 */
export function pick(obj, keys) {
  let source = {};
  if (Object(obj) === obj) {
    source = obj;
  }

  return Object.fromEntries(
    keys.filter(key => key in source).map(key => [key, source[key]])
  );
}

/**
 * Creates a new object with the same keys but with values transformed by a function
 * @param {Object} obj - The source object
 * @param {Function} fn - The transformation function
 * @returns {Object} A new object with transformed values
 */
export function mapValues(obj, fn) {
  const source = Object(obj) === obj ? obj : {};
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, fn(value, key)])
  );
}
