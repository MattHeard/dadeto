/**
 * Creates a shallow copy of an object with only the specified keys
 * @param {object} obj - The source object
 * @param {string[]} keys - The keys to include in the new object
 * @returns {object} A new object with only the specified keys
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
 * @param {object} source - The source object
 * @param {Function} fn - Transformation applied to each value
 * @returns {object} A new object with transformed values
 */
function transformEntries(source, fn) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, fn(value, key)])
  );
}

/**
 * Maps over the values of an object and returns the new object.
 * @param {object} obj - Source object.
 * @param {Function} fn - Mapping function `(value, key)`.
 * @returns {object} Object with mapped values.
 */
export function mapValues(obj, fn) {
  if (Object(obj) !== obj) {
    return {};
  }
  return transformEntries(obj, fn);
}

/**
 * Creates a deep clone of the provided value using JSON serialization.
 * @param {*} value - The value to clone
 * @returns {*} The cloned value
 */
export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
