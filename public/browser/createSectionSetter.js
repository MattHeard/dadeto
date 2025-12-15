import { isObject } from './common.js';
import { safeJsonParse, deepMerge } from './browser-core.js';
import { deepClone } from '../objectUtils.js';

/**
 * Creates a function that merges JSON input into a section of the data object.
 * @param {string} section - The property name to merge into.
 * @returns {(input: string, env: Map<string, Function>) => string} Setter function
 */
export function createSectionSetter(section) {
  return function setSection(input, env) {
    const result = parseJsonObject(input);
    if (!result.ok) {
      return result.message;
    }
    return mergeSection(section, result.data, env);
  };
}

/**
 * Parse JSON input into an object.
 * @param {string} input - JSON string to parse.
 * @returns {{ok: boolean, message?: string, data?: object}} Result object.
 */
function parseJsonObject(input) {
  const parsed = safeJsonParse(input);
  if (!parsed.ok) {
    return parsed;
  }
  return ensurePlainObject(parsed.data);
}

/**
 * Ensure a value is a plain object.
 * @param {*} value - Parsed JSON value.
 * @returns {{ok: boolean, message?: string, data?: object}} Validation result.
 */
function ensurePlainObject(value) {
  if (!isObject(value)) {
    return { ok: false, message: 'Error: Input JSON must be a plain object.' };
  }
  return { ok: true, data: value };
}

/**
 * Ensure the given object has a plain object at the specified section.
 * @param {object} data - The data object to modify.
 * @param {string} section - The key to check on the data object.
 */
function ensureSectionObject(data, section) {
  if (!isObject(data[section])) {
    data[section] = {};
  }
}

/**
 * Deep merges parsed JSON into a section of the global data.
 * @param {string} section - Target section name.
 * @param {object} inputJson - Parsed JSON data to merge.
 * @param {Map<string, Function>} env - Accessor environment with get/set.
 * @returns {string} Status message describing the result.
 */
function mergeSection(section, inputJson, env) {
  const getData = env.get('getData');
  const setLocalTemporaryData = env.get('setLocalTemporaryData');
  try {
    const currentData = getData();
    const newData = deepClone(currentData);
    ensureSectionObject(newData, section);
    newData[section] = deepMerge(newData[section], inputJson);
    setLocalTemporaryData(newData);
    const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
    return `Success: ${sectionName} data deep merged.`;
  } catch (error) {
    return `Error updating ${section} data: ${error.message}`;
  }
}
