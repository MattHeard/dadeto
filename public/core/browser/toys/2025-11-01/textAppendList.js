import {
  ensureString,
  normalizeNonStringValue,
  stringOrFallback,
} from '../../../commonCore.js';

// Toy: Text Append List
// (string input, env) -> string

const TOY_KEY = 'LIST1';

/**
 * Append input text to a persistent newline-delimited list stored in localStorage.
 * @param {string} input - Text appended to the list.
 * @param {Map<string, Function>} env - Environment with storage helpers.
 * @returns {string} The full accumulated list after appending the new input.
 */
export function textAppendList(input, env) {
  const normalizedInput = normalizeInput(input);
  const storageFn = getStorageFunction(env);
  if (!storageFn) {
    return `${normalizedInput}\n`;
  }

  const previous = readExistingList(storageFn);
  const updated = `${previous}${normalizedInput}\n`;
  persistUpdatedList(storageFn, updated);
  return updated;
}

/**
 *
 * @param {unknown} value - Value read from the toy input.
 * @returns {string} Normalized string value.
 */
function normalizeInput(value) {
  return stringOrFallback(value, normalizeNonStringValue);
}

/**
 *
 * @param {{get?: (key: string) => unknown}} env - Environment with storage dependencies.
 * @returns {((args: object) => unknown) | null} Storage helper when available.
 */
function getStorageFunction(env) {
  if (!isStorageEnvironment(env)) {
    return null;
  }

  return resolveStorageFn(env);
}

/**
 * Check whether the provided environment exposes the expected storage getter.
 * @param {{ get?: (key: string) => unknown } | null | undefined} env - Dependency bag with storage accessors.
 * @returns {boolean} True when the storage helper is available.
 */
function isStorageEnvironment(env) {
  return Boolean(env && typeof env.get === 'function');
}

/**
 * Resolve the persistence helper from the environment.
 * @param {{ get: (key: string) => unknown }} env - Environment containing the storage getter.
 * @returns {((args: object) => unknown) | null} Storage function when available.
 */
function resolveStorageFn(env) {
  const storageFn = env.get('setLocalPermanentData');
  if (typeof storageFn === 'function') {
    return storageFn;
  }

  return null;
}

/**
 *
 * @param {(args: object) => unknown} storageFn - Storage accessor used to read the current list.
 * @returns {string} Stored list contents or empty string.
 */
function readExistingList(storageFn) {
  try {
    return getStoredListValue(storageFn);
  } catch {
    return '';
  }
}

/**
 * Read the current list contents from storage while ensuring a string is returned.
 * @param {(args: object) => unknown} storageFn - Storage accessor used to read the current list.
 * @returns {string} Stored list contents or an empty string.
 */
function getStoredListValue(storageFn) {
  const existingData = storageFn({});
  return ensureString(existingData?.[TOY_KEY]);
}

/**
 * Persist the updated list into storage.
 * @param {(args: object) => unknown} storageFn - Function writing the updated list to storage.
 * @param {string} list - Latest list contents to persist.
 * @returns {void}
 */
function persistUpdatedList(storageFn, list) {
  try {
    storageFn({ [TOY_KEY]: list });
  } catch {
    // Ignore persistence errors while still returning the latest list.
  }
}
