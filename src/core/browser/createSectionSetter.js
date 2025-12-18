import { isObject } from './common.js';
import { safeJsonParse, deepMerge, deepClone } from './browser-core.js';

/**
 * @typedef {{ ok: true; data: SectionData; message?: string }} ParseSuccess
 * @typedef {{ ok: false; message: string }} ParseFailure
 * @typedef {ParseSuccess | ParseFailure} ParseResult
 * @typedef {Record<string, unknown>} SectionData
 * @typedef {Map<string, Function>} SectionSetterEnv
 */

/**
 * Determine whether parsing yielded a valid object.
 * @param {ParseResult} result - Result from parsing JSON input.
 * @returns {result is ParseSuccess} True when parsing succeeded with data.
 */
function hasParsedData(result) {
  return result.ok && Boolean(result.data);
}

/**
 * @param {ParseFailure} result - Result from parsing JSON input.
 * @returns {string} Message describing why parsing failed.
 */
function formatParseFailure(result) {
  return result.message;
}

/**
 * Creates a function that merges JSON input into a section of the data object.
 * @param {string} section - The property name to merge into.
 * @returns {(input: string, env: Map<string, Function>) => string} Setter function that validates and merges payloads.
 */
export function createSectionSetter(section) {
  return function setSection(input, env) {
    const result = parseJsonObject(input);
    if (!hasParsedData(result)) {
      return formatParseFailure(result);
    }
    return mergeSection(section, result.data, env);
  };
}

/**
 * Parse JSON input into an object.
 * @param {string} input - JSON string to parse.
 * @returns {ParseResult} Result object.
 */
function parseJsonObject(input) {
  const parsed = /** @type {ParseResult} */ (safeJsonParse(input));
  if (!parsed.ok) {
    return parsed;
  }
  return ensurePlainObject(parsed.data);
}

/**
 * Ensure a value is a plain object.
 * @param {*} value - Parsed JSON value.
 * @returns {ParseResult} Validation result.
 */
function ensurePlainObject(value) {
  if (!isObject(value)) {
    return { ok: false, message: 'Error: Input JSON must be a plain object.' };
  }
  return { ok: true, data: value };
}

/**
 * Ensure the given object has a plain object at the specified section.
 * @param {SectionData} data - The data object to modify.
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
 * @param {SectionData} inputJson - Parsed JSON data to merge.
 * @param {SectionSetterEnv} env - Accessor environment with get/set.
 * @returns {string} Status message describing the result.
 */
function mergeSection(section, inputJson, env) {
  const getData = getEnvFunction(env, 'getData', () => ({}));
  const setLocalTemporaryData = getEnvFunction(
    env,
    'setLocalTemporaryData',
    () => {}
  );
  return withMergeErrorHandling(
    () =>
      executeMerge({
        section,
        inputJson,
        getData,
        setLocalTemporaryData,
      }),
    section
  );
}

/**
 * Execute the merge process assuming error handling is managed by the caller.
 * @param {{section: string, inputJson: SectionData, getData: () => SectionData, setLocalTemporaryData: (data: SectionData) => void}} options Merge options.
 * @returns {string} Success message.
 */
function executeMerge({ section, inputJson, getData, setLocalTemporaryData }) {
  const currentData = getData();
  const newData = deepClone(currentData);
  ensureSectionObject(newData, section);
  newData[section] = deepMerge(newData[section], inputJson);
  setLocalTemporaryData(newData);
  const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
  return `Success: ${sectionName} data deep merged.`;
}

/**
 * Run the merge action while translating thrown values into user-facing messages.
 * @param {() => string} action - Merge action that may throw.
 * @param {string} section - Section name for the error message.
 * @returns {string} Result message from the action or the formatted error.
 */
function withMergeErrorHandling(action, section) {
  try {
    return action();
  } catch (error) {
    const detail = extractErrorDetail(error);
    return `Error updating ${section} data: ${detail}`;
  }
}

/**
 * Extract a friendly message from the provided error value.
 * @param {unknown} error Candidate error value.
 * @returns {string} Message describing the error.
 */
function extractErrorDetail(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

/**
 * Retrieve a callable from the environment or fall back to the provided default.
 * @template {Function} T
 * @param {SectionSetterEnv} env - Environment map containing helpers.
 * @param {string} key - Key to lookup on the env map.
 * @param {T} fallback - Callable used when the env entry is missing.
 * @returns {T} Callable retrieved from env or the fallback.
 */
function getEnvFunction(env, key, fallback) {
  const candidate = env.get(key);
  if (typeof candidate === 'function') {
    return /** @type {T} */ (candidate);
  }
  return fallback;
}
