export { ensureDend2, createOptions };

import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';

/**
 * Check whether a value is a non-null object.
 * @param {*} value - Value to check.
 * @returns {boolean} True if `value` is an object.
 */
function isObject(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Create a blank DEND2 structure.
 * @returns {object} Empty DEND2 object.
 */
function createEmptyDend2() {
  return { stories: [], pages: [], options: [] };
}

/**
 * Check that the given properties on an object are arrays.
 * @param {object} obj - Object to inspect.
 * @param {string[]} keys - Property names to verify as arrays.
 * @returns {boolean} True when every property is an array.
 */
function hasArrayProps(obj, keys) {
  return keys.every(key => Array.isArray(obj[key]));
}

/**
 * Validate that an object is a proper DEND2 structure.
 * @param {object} obj - Object to validate.
 * @returns {boolean} True if `obj` is valid.
 */
function isValidDend2(obj) {
  return isObject(obj) && hasArrayProps(obj, ['stories', 'pages', 'options']);
}

/**
 * Determine whether the provided data has a valid temporary.DEND2 structure.
 * @param {object} data - Data object to inspect.
 * @returns {boolean} True when valid.
 */
function isTemporaryValid(data) {
  if (!isObject(data.temporary)) {
    return false;
  }
  return isValidDend2(data.temporary.DEND2);
}

/**
 * Ensure the data object includes a well-formed temporary.DEND2 property.
 * @param {object} data - Data object to update.
 * @returns {void}
 */
function ensureDend2(data) {
  if (!isTemporaryValid(data)) {
    data.temporary = { DEND2: createEmptyDend2() };
  }
}

/**
 * Create option objects for values present in the input data.
 * @param {object} data - Source data that may contain option values.
 * @param {Function} getUuid - Function that generates unique IDs.
 * @param {string} [pageId] - Optional page identifier to include on each option.
 * @returns {Array<object>} Option list.
 */
function createOptions(data, getUuid, pageId) {
  return DENDRITE_OPTION_KEYS.filter(key => data[key]).map(key => {
    const option = { id: getUuid(), content: data[key] };
    if (pageId) {
      option.pageId = pageId;
    }
    return option;
  });
}
