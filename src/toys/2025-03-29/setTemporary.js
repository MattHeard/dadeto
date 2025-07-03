import { isObject } from '../../utils/typeUtils.js';
import { deepMerge } from '../../browser/data.js';

/**
 * Parses input as JSON, deep merges it into the 'temporary' object obtained via env.getData(),
 * and then passes the entire modified data structure back to env.setData().
 * @param {string} input - A JSON string to parse and merge.
 * @param {Map<string, Function>} env - Environment map. Expected: 'getData()', 'setData(data)'.
 * @returns {string} A confirmation message or an error message.
 */
export function setTemporary(input, env) {
  let inputJson;
  try {
    inputJson = JSON.parse(input);
  } catch (parseError) {
    return `Error: Invalid JSON input. ${parseError.message}`;
  }
  return processSetTemporary(inputJson, env);
}

function processSetTemporary(inputJson, env) {
  if (!isObject(inputJson)) {
    return 'Error: Input JSON must be a plain object.';
  }
  return handleValidTemporaryInput(inputJson, env);
}

function handleValidTemporaryInput(inputJson, env) {
  const getData = env.get('getData');
  const setData = env.get('setData');
  try {
    return mergeTemporaryData(getData, setData, inputJson);
  } catch (error) {
    return `Error updating temporary data: ${error.message}`;
  }
}

function mergeTemporaryData(getData, setData, inputJson) {
  const currentData = getData();
  const newData = JSON.parse(JSON.stringify(currentData));
  if (!isObject(newData.temporary)) {
    newData.temporary = {};
  }
  newData.temporary = deepMerge(newData.temporary, inputJson);
  setData(newData);
  return `Success: Temporary data deep merged.`;
}
