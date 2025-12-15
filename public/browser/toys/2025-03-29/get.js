import { when } from '../../common.js';

/**
 * Determine whether the supplied value represents an error string.
 * @param {unknown} value - Value to inspect.
 * @returns {boolean} True when the value is a string beginning with "Error:".
 */
function isErrorString(value) {
  return typeof value === 'string' && value.startsWith('Error:');
}

/**
 * Retrieve the value located at the provided path within the data.
 * @param {object|Array} data - Object or array to traverse.
 * @param {string} input - Dot separated path string.
 * @returns {*|string} The found value or an error string.
 */
function getValueAtPath(data, input) {
  const pathSegments = input.split('.');
  return traversePathSegments(data, pathSegments);
}

/**
 * Walk through each segment of the path to obtain the final value.
 * @param {object|Array} data - Data structure being traversed.
 * @param {string[]} pathSegments - Individual path tokens.
 * @returns {*|string} Resulting value or an error string.
 */
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

/**
 * Process a single path segment during traversal.
 * @param {*} currentValue - Value at the current path.
 * @param {string} segment - Segment to evaluate.
 * @param {string} currentPath - Path accumulated so far.
 * @returns {{value: *, path: string, error: string|null}} Result of the iteration.
 */
function handlePathSegmentIteration(currentValue, segment, currentPath) {
  const result = traverseSegment(currentValue, segment, currentPath);
  if (result.error) {
    return { error: result.error };
  }
  return { value: result.value, path: result.path, error: null };
}

/**
 * Continue traversal into the next segment.
 * @param {*} currentValue - Current value at the path.
 * @param {string} segment - Segment being processed.
 * @param {string} currentPath - Path accumulated so far.
 * @returns {{value: *, path: string, error: string|null}} Result after this step.
 */
function traverseSegment(currentValue, segment, currentPath) {
  const nextPath = getNextPath(currentPath, segment);
  const errorResult = createNonObjectErrorResult(
    currentValue,
    segment,
    nextPath
  );
  return errorResult ?? getSegmentValueOrError(currentValue, segment, nextPath);
}

/**
 *
 * @param currentPath
 * @param segment
 */
/**
 * Build the next path string by appending the segment.
 * @param {string} currentPath - Existing path portion.
 * @param {string} segment - Segment to append.
 * @returns {string} Updated path string.
 */
function getNextPath(currentPath, segment) {
  if (currentPath) {
    return `${currentPath}.${segment}`;
  } else {
    return segment;
  }
}

/**
 * Retrieve the value for the provided segment or generate an error result.
 * @param {object|Array} currentValue - Object currently being inspected.
 * @param {string} segment - Key or index being accessed.
 * @param {string} nextPath - Full path including this segment.
 * @returns {{value: *, path: string, error: string|null}} Lookup result.
 */
function getSegmentValueOrError(currentValue, segment, nextPath) {
  if (hasOwnSegment(currentValue, segment)) {
    return { value: currentValue[segment], path: nextPath, error: null };
  }
  return {
    value: undefined,
    path: nextPath,
    error: getSegmentNotFoundError(currentValue, segment, nextPath),
  };
}

/**
 * Create an error message when a segment is accessed on a non-object value.
 * @param {*} currentValue - Value being accessed.
 * @param {string} segment - Segment name.
 * @param {string} currentPath - Full path used for the lookup.
 * @returns {string|null} Error string when invalid, otherwise null.
 */
function getNonObjectSegmentError(currentValue, segment, currentPath) {
  if (isNonObjectValue(currentValue)) {
    return `Error: Cannot access property '${
      segment
    }' on non-object value at path '${currentPath.substring(
      0,
      currentPath.lastIndexOf('.')
    )}'. Value is: ${JSON.stringify(currentValue)}`;
  } else {
    return null;
  }
}

/**
 * Create a structured result when a segment access occurs on a non-object.
 * @param {*} currentValue - Value being accessed.
 * @param {string} segment - Segment name.
 * @param {string} currentPath - Full path used for the lookup.
 * @returns {{error: string}|null} Object describing the error or null when valid.
 */
function createNonObjectErrorResult(currentValue, segment, currentPath) {
  const nonObjectError = getNonObjectSegmentError(
    currentValue,
    segment,
    currentPath
  );
  return when(nonObjectError !== null, () => ({ error: nonObjectError }));
}

/**
 * Determine if the provided value is not an object.
 * @param {*} value - Value to evaluate.
 * @returns {boolean} True when the value is null or not of type 'object'.
 */
function isNonObjectValue(value) {
  return value === null || typeof value !== 'object';
}

/**
 * Test whether the provided value has the given property.
 * @param {object|Array} currentValue - Object to check.
 * @param {string} segment - Property name or index.
 * @returns {boolean} True when the property exists directly on the object.
 */
function hasOwnSegment(currentValue, segment) {
  return Object.hasOwn(currentValue, segment);
}

/**
 * Construct an error message for a missing path segment.
 * @param {object|Array} currentValue - Object being accessed.
 * @param {string} segment - Missing segment name.
 * @param {string} currentPath - Path used when the segment was missing.
 * @returns {string} Formatted error message.
 */
function getSegmentNotFoundError(currentValue, segment, currentPath) {
  return `Error: Path segment '${segment}' not found at '${currentPath}'. Available keys/indices: ${Object.keys(currentValue).join(', ')}`;
}

/**
 *
 * @param input
 * @param data
 */
/**
 * Return the entire data when no path is specified.
 * @param {string} input - Raw path input from the user.
 * @param {object|Array} data - Data to stringify if input is empty.
 * @returns {string|null} JSON string when input is empty, otherwise null.
 */
function handleEmptyInputInGet(input, data) {
  if (input.trim() === '') {
    return JSON.stringify(data);
  }
  return null;
}

/**
 * Convert the traversal result into a final string response.
 * @param {*} valueOrError - Value returned from traversal.
 * @param {string} input - Original path string.
 * @returns {string} JSON stringified value or error message.
 */
function handleValueOrErrorResult(valueOrError, input) {
  if (isErrorString(valueOrError)) {
    return valueOrError;
  }
  return safeStringifyValueAtPath(valueOrError, input);
}

/**
 * Safely stringify a value for returning to the caller.
 * @param {*} value - Value to stringify.
 * @param {string} input - Original path string for error reporting.
 * @returns {string} Stringified value or error description.
 */
function safeStringifyValueAtPath(value, input) {
  try {
    return JSON.stringify(value);
  } catch (stringifyError) {
    return `Error stringifying final value at path "${input}": ${stringifyError.message}`;
  }
}

/**
 * Validate that the data returned by `getData` is usable.
 * @param {*} data - Value returned by the environment.
 * @returns {string|null} Error message when invalid, otherwise null.
 */
function checkDataValidityInGet(data) {
  if (isInvalidGetDataResult(data)) {
    return "Error: 'getData' did not return a valid object or array.";
  }
  return null;
}

/**
 * Determine whether the data returned by `getData` is invalid.
 * @param {*} data - Data to test.
 * @returns {boolean} True when the data is null or not an object/array.
 */
function isInvalidGetDataResult(data) {
  return data === null || isNotObjectOrArray(data);
}

/**
 * Check whether the given value is neither an object nor an array.
 * @param {*} data - Value to examine.
 * @returns {boolean} True if data is not an object and not an array.
 */
function isNotObjectOrArray(data) {
  return typeof data !== 'object' && !Array.isArray(data);
}

/**
 * Finalize the traversal result for a non-empty path.
 * @param {object|Array} data - Data to search.
 * @param {string} input - Dot separated path string.
 * @returns {string} JSON stringified result or error message.
 */
function getFinalResultInGet(data, input) {
  const value = getValueAtPath(data, input);
  return handleValueOrErrorResult(value, input);
}

/**
 * Pass through the retrieval error when one occurred.
 * @param {string|null} error - Error message from data retrieval.
 * @returns {string|null} The same error message or null.
 */
function handleDataRetrievalErrorInGet(error) {
  if (error) {
    return error;
  }
  return null;
}

/**
 * Execute `getData` and capture any thrown errors.
 * @param {Function} getData - Function providing the data.
 * @param {string} input - Path string for contextual error messages.
 * @returns {{data: *}|{error: string}} Object containing data or error.
 */
function getDataWithCatch(getData, input) {
  try {
    return { data: getData() };
  } catch (error) {
    return {
      error: `Error during data retrieval or path traversal for "${input}": ${error.message}`,
    };
  }
}

/**
 * Retrieve a value from the environment's data using the provided path.
 * @param {string} input - Dot separated path to the desired value.
 * @param {Map<string,Function>} env - Environment map expected to contain `getData`.
 * @returns {string} JSON stringified value or an error description.
 */
export function get(input, env) {
  const getData = env.get('getData');
  const { data, error } = getDataWithCatch(getData, input);
  const retrievalError = handleDataRetrievalErrorInGet(error);
  if (retrievalError !== null) {
    return retrievalError;
  }

  return getFinalResultAfterRetrieval(input, data);
}

/**
 * Resolve the final result once the data has been fetched.
 * @param {string} input - Original path string.
 * @param {object|Array} data - Retrieved data object.
 * @returns {string} JSON string or error message.
 */
function getFinalResultAfterRetrieval(input, data) {
  const emptyInput = handleEmptyInputInGet(input, data);
  if (emptyInput !== null) {
    return emptyInput;
  }

  return getValidDataResultAfterEmptyCheck(data, input);
}

/**
 * Ensure the retrieved data is valid before returning the final result.
 * @param {object|Array} data - Retrieved data.
 * @param {string} input - Original path string.
 * @returns {string} JSON string or error message.
 */
function getValidDataResultAfterEmptyCheck(data, input) {
  const invalidData = checkDataValidityInGet(data);
  if (invalidData) {
    return invalidData;
  }

  return getFinalResultInGet(data, input);
}
