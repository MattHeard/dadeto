/**
 * Formats an object as a string representation
 * @param {Object} obj - The object to format
 * @param {Object} options - Formatting options
 * @param {boolean} [options.multiline=false] - Whether to use multiple lines
 * @returns {string} The formatted string representation
 */
export function formatAsString(obj, { multiline = false } = {}) {
  if (obj === null || obj === undefined) {return '{}';}
  if (typeof obj !== 'object') {return String(obj);}

  const entries = Object.entries(obj);
  if (entries.length === 0) {return '{}';}

  const separator = multiline ? '\n  ' : ' ';
  const entrySeparator = multiline ? ',\n  ' : ', ';

  const formattedEntries = entries
    .map(([key, value]) => {
      let valueStr;
      if (value === null) {valueStr = 'null';}
      else if (value === undefined) {valueStr = 'undefined';}
      else if (typeof value === 'object') {valueStr = formatAsString(value, { multiline });}
      else {valueStr = JSON.stringify(value);}

      return `${key}: ${valueStr}`;
    })
    .join(entrySeparator);

  return `{${separator}${formattedEntries}${multiline ? '\n' : ' '}}`;
}

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
