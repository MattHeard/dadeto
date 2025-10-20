/**
 * Check if a value is a non-null object.
 * @param {*} value - Value to test.
 * @returns {boolean} True when the value is a non-null object.
 */
export function isNonNullObject(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Checks that two values are both not arrays.
 * @param {*} a - First value to inspect.
 * @param {*} b - Second value to inspect.
 * @returns {boolean} True when neither value is an array.
 */
function bothAreNotArrays(a, b) {
  return !Array.isArray(a) && !Array.isArray(b);
}

/**
 * Checks that two values are both non-null objects.
 * @param {*} a - First value to inspect.
 * @param {*} b - Second value to inspect.
 * @returns {boolean} True when both values are non-null objects.
 */
function bothAreNonNullObjects(a, b) {
  return isNonNullObject(a) && isNonNullObject(b);
}

/**
 * Determines whether two values should be merged recursively.
 * @param {*} targetValue - The destination value.
 * @param {*} sourceValue - The source value.
 * @returns {boolean} True when a deep merge should occur.
 */
function shouldDeepMerge(targetValue, sourceValue) {
  return (
    bothAreNonNullObjects(targetValue, sourceValue) &&
    bothAreNotArrays(targetValue, sourceValue)
  );
}

/**
 * Deeply merges two objects, producing a new object.
 * @param {object} target - Destination object.
 * @param {object} source - Source object to merge.
 * @returns {object} The merged object.
 */
export function deepMerge(target, source) {
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
