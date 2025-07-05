import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';
import { deepClone } from '../../utils/objectUtils.js';

/**
 * Converts option fields in the data object into an array of objects.
 * @param {object} data - Parsed story data.
 * @param {Function} getUuid - UUID generator.
 * @returns {object[]} Normalized options list.
 */
function createOptions(data, getUuid) {
  const keys = DENDRITE_OPTION_KEYS;
  return keys
    .filter(key => data[key])
    .map(key => ({ id: getUuid(), content: data[key] }));
}

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
 * Adds a new dendrite story entry to the application's data store.
 * @param {string} input - JSON string containing story data.
 * @param {Map<string, Function>} env - Environment with data accessors.
 * @returns {string} The serialized newly added story or empty object on error.
 */
export function startLocalDendriteStory(input, env) {
  try {
    const data = JSON.parse(input);
    const getUuid = env.get('getUuid');
    const getData = env.get('getData');
    const setLocalTemporaryData = env.get('setLocalTemporaryData');

    const result = {
      id: getUuid(),
      title: data.title,
      content: data.content,
      options: createOptions(data, getUuid),
    };

    const currentData = getData();
    const newData = deepClone(currentData);
    ensureTemporaryData(newData);
    newData.temporary.DEND1.push(result);
    setLocalTemporaryData(newData);

    return JSON.stringify(result);
  } catch {
    return JSON.stringify({});
  }
}
