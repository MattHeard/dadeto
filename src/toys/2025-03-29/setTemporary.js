/**
 * Parses input as JSON, merges it into a 'temporary' object obtained via env.getData(),
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

  if (typeof inputJson !== 'object' || inputJson === null || Array.isArray(inputJson)) {
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
    // 1. Get the current data state
    const currentData = getData(); 

    if (typeof currentData !== 'object' || currentData === null) {
        return "Error: 'getData' did not return a valid object.";
    }

    // 2. Create a mutable copy to avoid modifying the original potentially immutable object from getData
    //    (Deep clone might be safer if nested objects within temporary need independent modification later)
    const newData = { ...currentData };

    // 3. Ensure the 'temporary' key exists and is an object in the new copy
    if (typeof newData.temporary !== 'object' || newData.temporary === null || Array.isArray(newData.temporary)) {
        newData.temporary = {}; // Initialize if not a valid object
    } else {
        // If temporary exists and is an object, make a copy of it too before merging
        newData.temporary = { ...newData.temporary };
    }

    // 4. Merge the input JSON into the temporary object copy
    Object.assign(newData.temporary, inputJson);

    // 5. Set the *entire* updated data structure back via setData
    setData(newData);

    return `Success: Temporary data updated.`; 

  } catch (error) {
    // Catch errors from getData(), setData(), or other issues
    return `Error updating temporary data: ${error.message}`;
  }
}
