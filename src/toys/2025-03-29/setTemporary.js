/**
 * Sets a temporary key-value pair in an in-memory store provided by the environment.
 * The data is typically temporary and lasts for the duration of the user's session or page load.
 * @param {string} input - The input string, expected format: "key=value".
 * @param {Map<string, Function>} env - Environment map containing dependencies. Expected: 'setTemporaryData(key, value)'.
 * @returns {string} A confirmation message or an error message.
 */
export function setTemporary(input, env) {
  if (typeof input !== 'string' || !input.includes('=')) {
    return "Error: Invalid input format. Please use 'key=value'.";
  }

  // Find the index of the first equals sign
  const equalsIndex = input.indexOf('=');
  const key = input.substring(0, equalsIndex).trim();
  // The value is everything after the first equals sign
  const value = input.substring(equalsIndex + 1);

  if (!key) {
    return "Error: Key cannot be empty. Please use 'key=value'.";
  }

  if (!env || typeof env.get !== 'function') {
    return "Error: 'env' Map with 'get' method is required.";
  }
  const setTemporaryData = env.get('setTemporaryData');
  if (typeof setTemporaryData !== 'function') {
    return "Error: 'setTemporaryData' function not found in env.";
  }

  try {
    setTemporaryData(key, value);
    // Consider escaping the key/value in the message if they can contain special characters
    return `Success: Temporary value set for key "${key}".`;
  } catch (error) {
    return `Error setting temporary data for key "${key}": ${error.message}`;
  }
}
