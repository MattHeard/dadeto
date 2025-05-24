/**
 * Creates a shallow copy of an object with only the specified keys
 * @param {Object} obj - The source object
 * @param {string[]} keys - The keys to include in the new object
 * @returns {Object} A new object with only the specified keys
 */
export function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') {return {};}

  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

/**
 * Creates a new object with the same keys but with values transformed by a function
 * @param {Object} obj - The source object
 * @param {Function} fn - The transformation function
 * @returns {Object} A new object with transformed values
 */
export function mapValues(obj, fn) {
  if (!obj || typeof obj !== 'object') {return {};}

  return Object.entries(obj).reduce((result, [key, value]) => {
    result[key] = fn(value, key);
    return result;
  }, {});
}
