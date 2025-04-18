/**
 * Checks if an item is a plain object (not an array or null).
 * @param {*} item - The item to check.
 * @returns {boolean}
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
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
  console.log('[deepMerge] called with:', { target, source });
  const output = { ...target }; // Start with a shallow copy of the target
  if (isObject(target) && isObject(source)) {
    console.log('[deepMerge] Both target and source are objects. Recursively merging.');
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];
      if (isObject(targetValue) && isObject(sourceValue)) {
        // If both target and source values are objects, recursively merge
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Otherwise, overwrite with the source value
        // (If sourceValue is an object, this assignment handles the case
        // where target[key] wasn't an object or didn't exist)
        output[key] = sourceValue;
      }
    });
  } else if (isObject(source)) {
    console.log('[deepMerge] Target is not object, but source is object. Returning shallow copy of source.');
      // If target is not an object but source is, return a shallow copy of source
      // (or deep copy if required, but shallow should suffice here as we merge onto it)
      return { ...source };
  }
  // If source is not an object, the initial shallow copy of target is returned
  // or target itself if it wasn't an object either (though initial checks prevent this)
  console.log('[deepMerge] Returning output:', output);
  return output;
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

  if (!isObject(inputJson)) { // Use the helper
      return "Error: Input JSON must be a plain object.";
  }

  if (!env || typeof env.get !== 'function') {
    return "Error: 'env' Map with 'get' method is required.";
  }
  const getData = env.get('getData');
  const setData = env.get('setData');
  if (typeof getData !== 'function') {
    return "Error: 'getData' function not found in env.";
  }
  if (typeof setData !== 'function') {
      return "Error: 'setData' function not found in env.";
  }

  try {
    const currentData = getData(); 

    if (!isObject(currentData)) { // Use the helper
        return "Error: 'getData' did not return a valid object.";
    }

    // Deep clone currentData to create newData - JSON method is simple but has limitations (e.g., with Dates, Functions)
    // For this use case, it should be acceptable.
    const newData = JSON.parse(JSON.stringify(currentData));

    // Ensure the 'temporary' key exists and is an object in the new copy
    if (!isObject(newData.temporary)) {
        newData.temporary = {}; 
    }

    // Perform the deep merge
    newData.temporary = deepMerge(newData.temporary, inputJson);

    setData(newData);

    return `Success: Temporary data deep merged.`; 

  } catch (error) {
    return `Error updating temporary data: ${error.message}`;
  }
}
