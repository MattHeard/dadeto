import { deepClone } from '../../browser-core.js';
import {
  runToyWithParsedJson,
  createOptions,
  getEnvHelpers,
} from '../browserToysCore.js';

/** @typedef {import('../browserToysCore.js').EnvHelperFunc} EnvHelperFunc */
/** @typedef {Map<string, EnvHelperFunc>} ToyEnv */
/** @typedef {import('../browserToysCore.js').ToyStorage} ToyStorage */

/**
 * @typedef {{ title: string, content: string }} DendriteStoryInput
 * @typedef {{id: string, title: string, content: string, options: object[]}} DendriteStoryResult
 * @typedef {{ temporary?: { DEND1?: DendriteStoryResult[] } }} DendriteStoryStorage
 */
/**
 * Determines whether the provided object has a valid temporary structure.
 * @param {DendriteStoryStorage} obj - Object to inspect.
 * @returns {boolean} True when `obj.temporary.DEND1` is an array.
 */
function hasValidTemporary(obj) {
  return Array.isArray(obj.temporary?.DEND1);
}

/**
 * Ensures that the object contains the expected temporary data structure.
 * @param {DendriteStoryStorage} obj - Object to mutate if needed.
 * @returns {void}
 */
function ensureTemporaryData(obj) {
  if (!hasValidTemporary(obj)) {
    obj.temporary = { DEND1: [] };
  }
}

/**
 * Create a normalized dendrite story result object from raw data.
 * @param {DendriteStoryInput} data - Parsed story data.
 * @param {() => string} getUuid - UUID generator.
 * @returns {DendriteStoryResult} Normalized story result.
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
 * @param {ToyEnv} env - Environment helpers.
 * @param {DendriteStoryResult} result - Story result to persist.
 * @returns {void}
 */
function persistStoryResult(env, result) {
  const { getData, setLocalTemporaryData } = getEnvHelpers(env);
  const currentData = getData();
  const newData = /** @type {DendriteStoryStorage} */ (deepClone(currentData));
  ensureTemporaryData(newData);
  const storyStorage = /** @type {{ temporary: { DEND1: DendriteStoryResult[] } }} */ (
    newData
  );
  storyStorage.temporary.DEND1.push(result);
  setLocalTemporaryData(/** @type {ToyStorage} */ (storyStorage));
}

/**
 * Adds a new dendrite story entry to the application's data store.
 * @param {string} input - JSON string containing story data.
 * @param {Map<string, Function>} env - Environment with data accessors.
 * @returns {string} The serialized newly added story or empty object on error.
 */
/**
 * Adds a new dendrite story entry to the application's data store.
 * @param {string} input - JSON string containing story data.
 * @param {ToyEnv} env - Environment with data accessors.
 * @returns {string} The serialized story or `'{}'` on error.
 */
export function startLocalDendriteStory(input, env) {
  return runToyWithParsedJson(
    input,
    /**
     * @param {object} parsed - Parsed payload from the caller.
     * @returns {string} Serialized story result saved into the temporary store.
     */
    parsed => {
      const data = /** @type {DendriteStoryInput} */ (parsed);
      const { getUuid } = getEnvHelpers(env);
      const result = createStoryResult(data, getUuid);

      persistStoryResult(env, result);
      return JSON.stringify(result);
    }
  );
}
