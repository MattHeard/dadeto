/**
 * Formats an object as a string representation
 * @param {Object} obj - The object to format
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.multiline=false] - Whether to use multiline formatting
 * @returns {string} The formatted string representation
 */
export function formatAsString(obj, { multiline = false } = {}) {
  if (obj === null || obj === undefined) {return '{}';}
  if (typeof obj !== 'object') {return String(obj);}

  const isArray = Array.isArray(obj);
  const entries = isArray ? obj.map((v, i) => [i, v]) : Object.entries(obj);

  if (entries.length === 0) {return isArray ? '[]' : '{}';}

  const formatValue = (value, forceInline = false) => {
    if (value === null) {return 'null';}
    if (value === undefined) {return 'undefined';}
    if (typeof value === 'string') {return `"${value}"`;}
    if (Array.isArray(value)) {return `[${value.join(',')}]`;}
    if (typeof value === 'object') {
      if (forceInline) {
        const inner = Object.entries(value)
          .map(([k, v]) => `${k}: ${formatValue(v, true)}`)
          .join(', ');
        return `{ ${inner} }`;
      }
      return formatAsString(value, { multiline });
    }
    return String(value);
  };

  if (multiline) {
    const formatted = entries
      .map(([key, value]) => {
        const formattedKey = isArray ? '' : `${key}: `;
        const formattedValue = formatValue(value, true);
        return `  ${formattedKey}${formattedValue}`;
      })
      .join(',\n');
    return `${isArray ? '[' : '{'}\n${formatted}\n${isArray ? ']' : '}'}`;
  }

  const formatted = entries
    .map(([key, value]) => isArray ? formatValue(value) : `${key}: ${formatValue(value, true)}`)
    .join(', ');
  return isArray ? `[${formatted}]` : `{ ${formatted} }`;
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
