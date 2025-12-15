import { runToyWithParsedJson } from '../browserToysCore.js';

// Toy: Set Permanent Data
// (string input, env) -> string

/**
 * Store permanent data using the environment helper.
 * @param {string} input - JSON string describing the permanent data.
 * @param {Map<string, Function>} env - Environment with `setLocalPermanentData`.
 * @returns {string} JSON string of the updated permanent data or '{}'.
 */
export function setPermanentData(input, env) {
  return runToyWithParsedJson(input, parsed => {
    const setLocalPermanentData = env.get('setLocalPermanentData');
    const result = setLocalPermanentData(parsed);
    return JSON.stringify(result);
  });
}
