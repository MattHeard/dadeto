/**
 * Retrieves a value from data provided by the environment using the input as a key.
 * @param {string} input - The key to look up in the data.
 * @param {Map<string, Function>} env - Environment map containing dependencies. Expected: 'getData'.
 * @returns {string} The JSON stringified value associated with the key, or an error message.
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
    // Ensure data is an object (and not null) before trying to access keys
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        return "Error: 'getData' did not return a valid plain object.";
    }
    if (Object.prototype.hasOwnProperty.call(data, input)) {
      // Return a string representation for display purposes
      const value = data[input];
      // Handle potential circular structures in JSON.stringify
      try {
        return JSON.stringify(value);
      } catch (stringifyError) {
          return `Error stringifying value for key "${input}": ${stringifyError.message}`;
      }
    } else {
      return `Error: Key "${input}" not found in data. Available keys: ${Object.keys(data).join(', ')}`;
    }
  } catch (error) {
      // Catch errors from getData() execution or other unexpected issues
      return `Error calling getData or accessing data: ${error.message}`;
  }
}
