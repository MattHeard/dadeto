/**
 * Checks if an item is a plain object (not an array or null).
 * @param {*} item - The item to check.
 * @returns {boolean}
 */
function isObject(item) {
  return item && isNonArrayObject(item);
}

function isNonArrayObject(item) {
  return typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deeply merges two objects. Creates a new object with merged properties.
 * Properties in source will overwrite properties in target, unless both
 * properties are plain objects, in which case they are recursively merged.
 * Arrays and other types are overwritten, not merged.
 * @param {object} target - The target object.
 * @param {object} source - The source object.
 * @returns {object} A new object representing the merged result.
 */
function deepMerge(target, source) {
  const output = { ...target };
  const mergeKey = key => {
    const targetValue = target[key];
    const sourceValue = source[key];
    if (shouldDeepMerge(targetValue, sourceValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  };
  Object.keys(source).forEach(mergeKey);
  return output;
}

function shouldDeepMerge(targetValue, sourceValue) {
  return isObject(targetValue) && isObject(sourceValue);
}


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
    return "Error: Input JSON must be a plain object.";
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
