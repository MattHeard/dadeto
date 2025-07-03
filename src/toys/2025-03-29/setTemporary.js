import { mergeIntoStateProperty } from '../../utils/stateMerge.js';

/**
 * Parses input as JSON, deep merges it into the 'temporary' object obtained via env.getData(),
 * and then passes the entire modified data structure back to env.setData().
 * @param {string} input - A JSON string to parse and merge.
 * @param {Map<string, Function>} env - Environment map. Expected: 'getData()', 'setData(data)'.
 * @returns {string} A confirmation message or an error message.
 */
export function setTemporary(input, env) {
  return mergeIntoStateProperty('temporary', input, env);
}
