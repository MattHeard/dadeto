import { isObject } from '../browser/common.js';
import { deepMerge } from '../browser/data.js';

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Parses JSON input and deep merges it into the given property of the global
 * state via env.get/ set functions.
 *
 * @param {string} property - Name of the property to merge into.
 * @param {string} input - JSON string representing an object.
 * @param {Map<string,Function>} env - Environment providing getData/setData.
 * @returns {string} Success or error message.
 */
export function mergeIntoStateProperty(property, input, env) {
  let inputJson;
  try {
    inputJson = JSON.parse(input);
  } catch (parseError) {
    return `Error: Invalid JSON input. ${parseError.message}`;
  }

  if (!isObject(inputJson)) {
    return 'Error: Input JSON must be a plain object.';
  }

  const getData = env.get('getData');
  const setData = env.get('setData');

  try {
    const currentData = getData();
    const newData = JSON.parse(JSON.stringify(currentData));
    if (!isObject(newData[property])) {
      newData[property] = {};
    }
    newData[property] = deepMerge(newData[property], inputJson);
    setData(newData);
    return `Success: ${capitalize(property)} data deep merged.`;
  } catch (error) {
    return `Error updating ${property} data: ${error.message}`;
  }
}
