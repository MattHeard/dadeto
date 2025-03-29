/**
 * Retrieves a value from data provided by the environment using the input as a path.
 * @param {string} input - The path (e.g., 'key1.key2.0.key3') to look up in the data.
 * @param {Map<string, Function>} env - Environment map containing dependencies. Expected: 'getData'.
 * @returns {string} The JSON stringified value found at the path, or an error message.
 */
export function get(input, env) {
  if (!env || typeof env.get !== 'function') {
    return "Error: 'env' Map with 'get' method is required.";
  }
  const getData = env.get('getData');
  if (typeof getData !== 'function') {
    return "Error: 'getData' function not found in env.";
  }

  try {
    const data = getData();
    // Basic check if initial data is an object or array
    if (data === null || (typeof data !== 'object' && !Array.isArray(data))) {
        return "Error: 'getData' did not return a valid object or array.";
    }

    // Split the input path by dots
    const pathSegments = input.split('.');
    let currentValue = data;
    let currentPath = '';

    // Traverse the path
    for (const segment of pathSegments) {
      currentPath = currentPath ? `${currentPath}.${segment}` : segment;
      if (currentValue === null || typeof currentValue !== 'object') {
        return `Error: Cannot access property '${segment}' on non-object value at path '${currentPath.substring(0, currentPath.lastIndexOf('.') !== -1 ? currentPath.lastIndexOf('.') : 0)}'. Value is: ${JSON.stringify(currentValue)}`;
      }

      if (Object.prototype.hasOwnProperty.call(currentValue, segment)) {
        currentValue = currentValue[segment];
      } else {
        return `Error: Path segment '${segment}' not found at '${currentPath}'. Available keys/indices: ${Object.keys(currentValue).join(', ')}`;
      }
    }

    // Return a string representation of the final value
    try {
      return JSON.stringify(currentValue);
    } catch (stringifyError) {
        return `Error stringifying final value at path "${input}": ${stringifyError.message}`;
    }
  } catch (error) {
      // Catch errors from getData() execution or other unexpected issues
      return `Error during data retrieval or path traversal for "${input}": ${error.message}`;
  }
}
