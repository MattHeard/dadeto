/**
 * Retrieves a value from data provided by the environment using the input as a path.
 * @param {string} input - The path (e.g., 'key1.key2.0.key3') to look up in the data.
 * @param {Map<string, Function>} env - Environment map containing dependencies. Expected: 'getData'.
 * @returns {string} The JSON stringified value found at the path, or an error message.
 */
function getValueAtPath(data, input) {
  const pathSegments = input.split('.');
  return traversePathSegments(data, pathSegments);
}

function traversePathSegments(data, pathSegments) {
  let state = { value: data, path: '', error: null };
  for (const segment of pathSegments) {
    const result = handlePathSegmentIteration(state.value, segment, state.path);
    if (result.error) {
      state.error = result.error;
      break;
    }
    state.value = result.value;
    state.path = result.path;
  }
  return state.error ? state.error : state.value;
}

function handlePathSegmentIteration(currentValue, segment, currentPath) {
  const result = traverseSegment(currentValue, segment, currentPath);
  if (typeof result === 'string' && result.startsWith('Error:')) {
    return { error: result };
  }
  return { value: result.value, path: result.path, error: null };
}

function traverseSegment(currentValue, segment, currentPath) {
  const nextPath = currentPath ? `${currentPath}.${segment}` : segment;
  const nonObjectError = getNonObjectSegmentError(currentValue, segment, nextPath);
  if (nonObjectError !== null) return nonObjectError;
  if (hasOwnSegment(currentValue, segment)) {
    return { value: currentValue[segment], path: nextPath };
  } else {
    return getSegmentNotFoundError(currentValue, segment, nextPath);
  }
}

function getNonObjectSegmentError(currentValue, segment, currentPath) {
  if (currentValue === null || typeof currentValue !== 'object') {
    return `Error: Cannot access property '${segment}' on non-object value at path '${currentPath.substring(0, currentPath.lastIndexOf('.'))}'. Value is: ${JSON.stringify(currentValue)}`;
  }
  return null;
}

function hasOwnSegment(currentValue, segment) {
  return Object.prototype.hasOwnProperty.call(currentValue, segment);
}

function getSegmentNotFoundError(currentValue, segment, currentPath) {
  return `Error: Path segment '${segment}' not found at '${currentPath}'. Available keys/indices: ${Object.keys(currentValue).join(', ')}`;
}

function validateAndGetData(env) {
  if (!env || typeof env.get !== 'function') {
    return "Error: 'env' Map with 'get' method is required.";
  }
  const getData = env.get('getData');
  if (typeof getData !== 'function') {
    return "Error: 'getData' function not found in env.";
  }
  return getData;
}

function handleEmptyInputInGet(input, data) {
  if (input.trim() === '') {
    return JSON.stringify(data);
  }
  return null;
}

function handleEmptyInput(input, data) {
  if (input.trim() === '') {
    return JSON.stringify(data);
  }
  return null;
}

function getResultOrError(getData, input) {
  const { error, data } = getDataWithCatch(getData, input);
  if (error) {
    return error;
  }
  return data;
}

function isErrorString(value) {
  return typeof value === 'string' && value.startsWith('Error:');
}

function handleValueOrErrorResult(valueOrError, input) {
  if (isErrorString(valueOrError)) {
    return valueOrError;
  }
  try {
    return JSON.stringify(valueOrError);
  } catch (stringifyError) {
    return `Error stringifying final value at path "${input}": ${stringifyError.message}`;
  }
}

function checkDataValidityInGet(data) {
  if (data === null || (typeof data !== 'object' && !Array.isArray(data))) {
    return "Error: 'getData' did not return a valid object or array.";
  }
  return null;
}

function getFinalResultInGet(data, input) {
  const value = getValueAtPath(data, input);
  return handleValueOrErrorResult(value, input);
}

function handleEnvErrorInGet(getDataOrError) {
  if (isErrorString(getDataOrError)) {
    return getDataOrError;
  }
  return null;
}

function handleDataRetrievalErrorInGet(error) {
  if (error) {
    return error;
  }
  return null;
}

function checkDataValidity(data) {
  if (data === null || (typeof data !== 'object' && !Array.isArray(data))) {
    return "Error: 'getData' did not return a valid object or array.";
  }
  return null;
}

function getDataWithCatch(getData, input) {
  try {
    return { data: getData() };
  } catch (error) {
    return { error: `Error during data retrieval or path traversal for "${input}": ${error.message}` };
  }
}

export function get(input, env) {
  const getDataOrError = validateAndGetData(env);
  const envError = handleEnvErrorInGet(getDataOrError);
  if (envError !== null) return envError;

  const getData = getDataOrError;
  const { data, error } = getDataWithCatch(getData, input);
  const retrievalError = handleDataRetrievalErrorInGet(error);
  if (retrievalError !== null) return retrievalError;

  const emptyInput = handleEmptyInputInGet(input, data);
  if (emptyInput !== null) return emptyInput;

  const invalidData = checkDataValidityInGet(data);
  if (invalidData) return invalidData;

  return getFinalResultInGet(data, input);
}
