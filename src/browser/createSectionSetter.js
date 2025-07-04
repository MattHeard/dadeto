import { isObject } from './common.js';
import { deepMerge } from './data.js';
import { deepClone } from '../utils/objectUtils.js';

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
 * Safely parse a JSON string.
 * @param {string} input - JSON string to parse.
 * @returns {{ok: boolean, message?: string, data?: object}} Parsed result.
 */
function safeJsonParse(input) {
  try {
    return { ok: true, data: JSON.parse(input) };
  } catch (parseError) {
    return {
      ok: false,
      message: `Error: Invalid JSON input. ${parseError.message}`,
    };
  }
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
 * Deep merges parsed JSON into a section of the global data.
 * @param {string} section - Target section name.
 * @param {object} inputJson - Parsed JSON data to merge.
 * @param {Map<string, Function>} env - Accessor environment with get/set.
 * @returns {string} Status message describing the result.
 */
function mergeSection(section, inputJson, env) {
  const getData = env.get('getData');
  const setData = env.get('setData');
  try {
    const currentData = getData();
    const newData = deepClone(currentData);
    if (!isObject(newData[section])) {
      newData[section] = {};
    }
    newData[section] = deepMerge(newData[section], inputJson);
    setData(newData);
    const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
    return `Success: ${sectionName} data deep merged.`;
  } catch (error) {
    return `Error updating ${section} data: ${error.message}`;
  }
}
