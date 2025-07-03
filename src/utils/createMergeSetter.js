import { isObject } from '../browser/common.js';
import { deepMerge } from '../browser/data.js';

/**
 * Creates a function that parses JSON input and deep merges it into a
 * property of the data object obtained via `env.getData()`.
 *
 * @param {string} property - The property name to merge into.
 * @param {string} successMessage - Message returned on success.
 * @returns {(input: string, env: Map<string, Function>) => string}
 */
export function createMergeSetter(property, successMessage) {
  return function setProperty(input, env) {
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
      return successMessage;
    } catch (error) {
      return `Error updating ${property} data: ${error.message}`;
    }
  };
}
