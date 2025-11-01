// Toy: Set Permanent Data
// (string input, env) -> string

/**
 * Store permanent data using the environment helper.
 * @param {string} input - JSON string describing the permanent data.
 * @param {Map<string, Function>} env - Environment with `setLocalPermanentData`.
 * @returns {string} JSON string of the updated permanent data or '{}'.
 */
export function setPermanentData(input, env) {
  try {
    const obj = JSON.parse(input);
    const setLocalPermanentData = env.get('setLocalPermanentData');
    const result = setLocalPermanentData(obj);
    return JSON.stringify(result);
  } catch {
    return JSON.stringify({});
  }
}
