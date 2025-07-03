import { isObject } from './common.js';
import { deepMerge } from './data.js';
import { deepClone } from '../utils/objectUtils.js';

/**
 * Creates a function that merges JSON input into a section of the data object.
 *
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

function parseJsonObject(input) {
  let json;
  try {
    json = JSON.parse(input);
  } catch (parseError) {
    return {
      ok: false,
      message: `Error: Invalid JSON input. ${parseError.message}`,
    };
  }
  if (!isObject(json)) {
    return { ok: false, message: 'Error: Input JSON must be a plain object.' };
  }
  return { ok: true, data: json };
}

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
