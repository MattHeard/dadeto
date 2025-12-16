import { deepClone } from '../../browser-core.js';
import { runToyWithParsedJson, createOptions } from '../browserToysCore.js';
/**
 * Determines whether the provided object has a valid temporary structure.
 * @param {object} obj - Object to inspect.
 * @returns {boolean} True when `obj.temporary.DEND1` is an array.
 */
function hasValidTemporary(obj) {
  return Array.isArray(obj.temporary?.DEND1);
}

/**
 * Ensures that the object contains the expected temporary data structure.
 * @param {object} obj - Object to mutate if needed.
 * @returns {void}
 */
function ensureTemporaryData(obj) {
  if (!hasValidTemporary(obj)) {
    obj.temporary = { DEND1: [] };
  }
}

/**
 * Create a normalized dendrite story result object from raw data.
 * @param {object} data - Parsed story data.
 * @param {() => string} getUuid - UUID generator.
 * @returns {object} Normalized story result.
 */
function createStoryResult(data, getUuid) {
  return {
    id: getUuid(),
    title: data.title,
    content: data.content,
    options: createOptions(data, getUuid),
  };
}

/**
 * Store the dendrite story result inside the environment's temporary data.
 * @param {Map<string, Function>} env - Environment helpers.
 * @param {object} result - Story result to persist.
 * @returns {void}
 */
function persistStoryResult(env, result) {
  const getData = env.get('getData');
  const setLocalTemporaryData = env.get('setLocalTemporaryData');
  const currentData = getData();
  const newData = deepClone(currentData);
  ensureTemporaryData(newData);
  newData.temporary.DEND1.push(result);
  setLocalTemporaryData(newData);
}

/**
 * Adds a new dendrite story entry to the application's data store.
 * @param {string} input - JSON string containing story data.
 * @param {Map<string, Function>} env - Environment with data accessors.
 * @returns {string} The serialized newly added story or empty object on error.
 */
export function startLocalDendriteStory(input, env) {
  return runToyWithParsedJson(input, data => {
    const getUuid = env.get('getUuid');
    const result = createStoryResult(data, getUuid);

    persistStoryResult(env, result);
    return JSON.stringify(result);
  });
}
