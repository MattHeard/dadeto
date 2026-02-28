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
 * @typedef {{ temporary?: { STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } }} DendriteStoryStorage
 */
/**
 * Check if temporary storage has a valid STAR1 array.
 * @param {{ STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } | undefined} temporary - Temporary storage object.
 * @returns {boolean} True if STAR1 is an array.
 */
function hasStar1Structure(temporary) {
  return Array.isArray(temporary?.STAR1);
}

/**
 * Check if temporary storage has a valid DEND1 array.
 * @param {{ STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } | undefined} temporary - Temporary storage object.
 * @returns {boolean} True if DEND1 is an array.
 */
function hasDend1Structure(temporary) {
  return Array.isArray(temporary?.DEND1);
}

/**
 * Check if temporary object is missing or lacks DEND1 structure.
 * @param {{ STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } | undefined} temporary - Storage object.
 * @returns {boolean} True when temporary is invalid or missing DEND1.
 */
function shouldSkipDend1(temporary) {
  return !temporary || !hasDend1Structure(temporary);
}

/**
 * Check if temporary object is missing or lacks STAR1 structure.
 * @param {{ STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } | undefined} temporary - Storage object.
 * @returns {boolean} True when temporary is invalid or missing STAR1.
 */
function shouldSkipStar1(temporary) {
  return !temporary || !hasStar1Structure(temporary);
}

/**
 * Resolve legacy DEND1 structure or empty array.
 * @param {{ STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } | undefined} temporary - Temporary storage object.
 * @returns {DendriteStoryResult[]} DEND1 array or empty array.
 */
function resolveLegacyStructure(temporary) {
  if (shouldSkipDend1(temporary)) {
    return [];
  }
  if (!temporary || !temporary.DEND1) {
    return [];
  }
  return /** @type {DendriteStoryResult[]} */ (temporary.DEND1);
}

/**
 * Determine which story array to use, with DEND1 legacy migration.
 * @param {{ STAR1?: DendriteStoryResult[], DEND1?: DendriteStoryResult[] } | undefined} temporary - Temporary storage object.
 * @returns {DendriteStoryResult[]} Array to use for STAR1.
 */
function resolveStar1Structure(temporary) {
  if (shouldSkipStar1(temporary)) {
    return resolveLegacyStructure(temporary);
  }
  if (!temporary || !temporary.STAR1) {
    return resolveLegacyStructure(temporary);
  }
  return /** @type {DendriteStoryResult[]} */ (temporary.STAR1);
}

/**
 * Ensures that the object contains the expected temporary data structure.
 * Migrates legacy DEND1 data to STAR1 when present.
 * @param {DendriteStoryStorage} obj - Object to mutate if needed.
 * @returns {void}
 */
function ensureTemporaryData(obj) {
  const star1Data = resolveStar1Structure(obj.temporary);
  obj.temporary =
    /** @type {NonNullable<DendriteStoryStorage['temporary']>} */ ({
      STAR1: star1Data,
    });
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
  const storyStorage =
    /** @type {{ temporary: { STAR1: DendriteStoryResult[] } }} */ (newData);
  storyStorage.temporary.STAR1.push(result);
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
