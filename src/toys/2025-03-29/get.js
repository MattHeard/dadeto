/**
 * Retrieves a value from data provided by the environment using the input as a path.
 * @param {string} input - The path (e.g., 'key1.key2.0.key3') to look up in the data.
 * @param {Map<string, Function>} env - Environment map containing dependencies. Expected: 'getData'.
 * @returns {string} The JSON stringified value found at the path, or an error message.
 */
function isErrorString(value) {
  return typeof value === 'string' && value.startsWith('Error:');
}

function getValueAtPath(data, input) {
  const pathSegments = input.split('.');
  return traversePathSegments(data, pathSegments);
}

function traversePathSegments(data, pathSegments) {
  const initialState = { value: data, path: '', error: null };
  const reducer = (acc, segment) => {
    if (acc.error) {
      return acc;
    }
    return handlePathSegmentIteration(acc.value, segment, acc.path);
  };
  const finalState = pathSegments.reduce(reducer, initialState);
  if (finalState.error) {
    return finalState.error;
  } else {
    return finalState.value;
  }
}

function handlePathSegmentIteration(currentValue, segment, currentPath) {
  const result = traverseSegment(currentValue, segment, currentPath);
  if (result.error) {
    return { error: result.error };
  }
  return { value: result.value, path: result.path, error: null };
}

function traverseSegment(currentValue, segment, currentPath) {
  const nextPath = getNextPath(currentPath, segment);
  const nonObjectError = getNonObjectSegmentError(currentValue, segment, nextPath);
  if (nonObjectError !== null) {
    return { error: nonObjectError };
  }

  const result = getSegmentValueOrError(currentValue, segment, nextPath);
  if (isErrorString(result)) {
    return { error: result };
  }
  return { value: result.value, path: result.path, error: null };
}

function getNextPath(currentPath, segment) {
  if (currentPath) {
    return `${currentPath}.${segment}`;
  } else {
    return segment;
  }
}

function getSegmentValueOrError(currentValue, segment, nextPath) {
  if (hasOwnSegment(currentValue, segment)) {
    return { value: currentValue[segment], path: nextPath };
  }
  return getSegmentNotFoundError(currentValue, segment, nextPath);
}

function getNonObjectSegmentError(currentValue, segment, currentPath) {
  if (isNonObjectValue(currentValue)) {
    return (
      "Error: Cannot access property '" +
      segment +
      "' on non-object value at path '" +
      currentPath.substring(0, currentPath.lastIndexOf('.')) +
      "'. Value is: " +
      JSON.stringify(currentValue)
    );
  } else {
    return null;
  }
}

function isNonObjectValue(value) {
  return value === null || typeof value !== 'object';
}

function hasOwnSegment(currentValue, segment) {
  return Object.hasOwn(currentValue, segment);
}

function getSegmentNotFoundError(currentValue, segment, currentPath) {
  return `Error: Path segment '${segment}' not found at '${currentPath}'. Available keys/indices: ${Object.keys(currentValue).join(', ')}`;
}



function handleEmptyInputInGet(input, data) {
  if (input.trim() === '') {
    return JSON.stringify(data);
  }
  return null;
}


function handleValueOrErrorResult(valueOrError, input) {
  if (isErrorString(valueOrError)) {
    return valueOrError;
  }
  return safeStringifyValueAtPath(valueOrError, input);
}

function safeStringifyValueAtPath(value, input) {
  try {
    return JSON.stringify(value);
  } catch (stringifyError) {
    return `Error stringifying final value at path "${input}": ${stringifyError.message}`;
  }
}

function checkDataValidityInGet(data) {
  if (isInvalidGetDataResult(data)) {
    return "Error: 'getData' did not return a valid object or array.";
  }
  return null;
}

function isInvalidGetDataResult(data) {
  return data === null || isNotObjectOrArray(data);
}

function isNotObjectOrArray(data) {
  return typeof data !== 'object' && !Array.isArray(data);
}


function getFinalResultInGet(data, input) {
  const value = getValueAtPath(data, input);
  return handleValueOrErrorResult(value, input);
}



function handleDataRetrievalErrorInGet(error) {
  if (error) {
    return error;
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
  const getData = env.get('getData');
  const { data, error } = getDataWithCatch(getData, input);
  const retrievalError = handleDataRetrievalErrorInGet(error);
  if (retrievalError !== null) {
    return retrievalError;
  }

  return getFinalResultAfterRetrieval(input, data);
}

function getFinalResultAfterRetrieval(input, data) {
  const emptyInput = handleEmptyInputInGet(input, data);
  if (emptyInput !== null) {
    return emptyInput;
  }

  return getValidDataResultAfterEmptyCheck(data, input);
}

function getValidDataResultAfterEmptyCheck(data, input) {
  const invalidData = checkDataValidityInGet(data);
  if (invalidData) {
    return invalidData;
  }

  return getFinalResultInGet(data, input);
}
