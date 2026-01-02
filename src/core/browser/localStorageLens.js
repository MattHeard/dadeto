import { createStorageLens, mapLens } from './storageLens.js';

/**
 * @module localStorageLens
 * @description Browser localStorage lens implementation with JSON serialization.
 * Data persists across page refreshes.
 */

/**
 * @typedef {object} LocalStorageLensOptions
 * @property {Storage | null} storage - Browser localStorage implementation.
 * @property {(message: string, ...args: unknown[]) => void} [logError] - Error logger.
 */

/**
 * Creates a localStorage lens with JSON serialization.
 * @param {LocalStorageLensOptions} options - Configuration options.
 * @returns {import('./storageLens.js').StorageLens<unknown>} A lens for localStorage.
 */
export function createLocalStorageLens({ storage, logError = () => {} }) {
  const baseLens = createRawLocalStorageLens(storage, logError);
  return mapLens(baseLens, deserializeJson(logError), serializeJson(logError));
}

/**
 * Creates a raw localStorage lens without JSON transformation.
 * @param {Storage | null} storage - Browser localStorage implementation.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {import('./storageLens.js').StorageLens<string | null>} A lens for raw localStorage.
 */
function createRawLocalStorageLens(storage, logError) {
  return createStorageLens(
    key => getFromStorage(storage, key, logError),
    makeStorageSetter(storage, logError)
  );
}

/**
 * Create a storage setter closure.
 * @param {Storage | null} storage - Browser storage.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {(key: string, value: string | null) => void} Storage setter.
 */
function makeStorageSetter(storage, logError) {
  return (key, value) => setToStorage({ storage, key, value, logError });
}

/**
 * Reads a value from storage.
 * @param {Storage | null} storage - Browser storage.
 * @param {string} key - Storage key.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {string | null} Stored value or null.
 */
function getFromStorage(storage, key, logError) {
  return withStorage(storage, st => safeGetItem(st, key, logError), null);
}

/**
 * Safely retrieve a value from storage.
 * @param {Storage} storage - Browser storage.
 * @param {string} key - Storage key.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {string | null} Stored value or null.
 */
function safeGetItem(storage, key, logError) {
  return tryWithLog(
    () => storage.getItem(key),
    logError,
    () => `Failed to read from localStorage key "${key}":`
  );
}

/**
 * Writes a value to storage.
 * @param {object} options - Storage write options.
 * @param {Storage | null} options.storage - Browser storage.
 * @param {string} options.key - Storage key.
 * @param {string | null} options.value - Value to store.
 * @param {(message: string, ...args: unknown[]) => void} options.logError - Error logger.
 */
function setToStorage({ storage, key, value, logError }) {
  withStorage(
    storage,
    st => applyStorageValue({ storage: st, key, value, logError }),
    undefined
  );
}

/**
 * Executes an operation only when storage is available.
 * @template TValue
 * @param {Storage | null} storage - Browser storage.
 * @param {(storage: Storage) => TValue} operation - Storage-aware callback.
 * @param {TValue} fallback - Value returned when storage is missing.
 * @returns {TValue} Result of the operation or fallback.
 */
function withStorage(storage, operation, fallback) {
  if (!storage) {
    return fallback;
  }

  return operation(storage);
}

/**
 * Apply a storage write with error handling.
 * @param {object} options - Storage write options.
 * @param {Storage} options.storage - Browser storage.
 * @param {string} options.key - Storage key.
 * @param {string | null} options.value - Value to store.
 * @param {(message: string, ...args: unknown[]) => void} options.logError - Error logger.
 */
function applyStorageValue({ storage, key, value, logError }) {
  tryWithLog(
    () => writeStorageValue(storage, key, value),
    logError,
    () => 'Failed to persist permanent data:'
  );
}

/**
 * Write a storage value, removing when null.
 * @param {Storage} storage - Browser storage.
 * @param {string} key - Storage key.
 * @param {string | null} value - Value to store.
 */
function writeStorageValue(storage, key, value) {
  if (value === null) {
    storage.removeItem(key);
    return;
  }

  storage.setItem(key, value);
}

/**
 * Creates a function that deserializes JSON strings.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {(value: string | null) => unknown} Deserializer function.
 */
function deserializeJson(logError) {
  return value => {
    if (isMissingStoredValue(value)) {
      return null;
    }

    return parseStoredJson(value, logError);
  };
}

/**
 * Determine if a stored value should be treated as missing.
 * @param {string | null | undefined} value - Stored value.
 * @returns {boolean} True when no value should be parsed.
 */
function isMissingStoredValue(value) {
  return [null, undefined, ''].includes(value);
}

/**
 * Parse stored JSON with error handling.
 * @param {string} value - JSON string.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {unknown} Parsed JSON value or null.
 */
function parseStoredJson(value, logError) {
  return tryWithLog(
    () => JSON.parse(value),
    logError,
    () => 'Failed to read permanent data:'
  );
}

/**
 * Creates a function that serializes values to JSON.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {(value: unknown) => string | null} Serializer function.
 */
function serializeJson(logError) {
  return value => {
    if (isNullish(value)) {
      return null;
    }

    return stringifyStoredJson(value, logError);
  };
}

/**
 * Test for nullish values.
 * @param {unknown} value - Value to test.
 * @returns {boolean} True when the value is null or undefined.
 */
function isNullish(value) {
  return value === null || value === undefined;
}

/**
 * Stringify JSON with error handling.
 * @param {unknown} value - Value to serialize.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {string | null} JSON string or null.
 */
function stringifyStoredJson(value, logError) {
  return tryWithLog(
    () => JSON.stringify(value),
    logError,
    () => 'Failed to serialize JSON for storage:'
  );
}

/**
 * Wraps an operation in try/catch and logs failures uniformly.
 * @template TValue
 * @param {() => TValue} operation - Function that might throw.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @param {() => string} errorMessage - Provides the log message.
 * @returns {TValue | null} Result of the operation or null when it fails.
 */
function tryWithLog(operation, logError, errorMessage) {
  try {
    return operation();
  } catch (error) {
    logError(errorMessage(), error);
    return null;
  }
}
