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
 * @returns {import('./storageLens.js').StorageLens} A lens for localStorage.
 */
export function createLocalStorageLens({ storage, logError = () => {} }) {
  const baseLens = createRawLocalStorageLens(storage, logError);
  return mapLens(baseLens, deserializeJson(logError), serializeJson(logError));
}

/**
 * Creates a raw localStorage lens without JSON transformation.
 * @param {Storage | null} storage - Browser localStorage implementation.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {import('./storageLens.js').StorageLens} A lens for raw localStorage.
 */
function createRawLocalStorageLens(storage, logError) {
  return createStorageLens(
    key => getFromStorage(storage, key, logError),
    (key, value) => setToStorage(storage, key, value, logError)
  );
}

/**
 * Reads a value from storage.
 * @param {Storage | null} storage - Browser storage.
 * @param {string} key - Storage key.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {string | null} Stored value or null.
 */
function getFromStorage(storage, key, logError) {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch (error) {
    logError(`Failed to read from localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Writes a value to storage.
 * @param {Storage | null} storage - Browser storage.
 * @param {string} key - Storage key.
 * @param {string | null} value - Value to store.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 */
function setToStorage(storage, key, value, logError) {
  if (!storage) {
    return;
  }

  try {
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch (error) {
    logError('Failed to persist permanent data:', error);
  }
}

/**
 * Creates a function that deserializes JSON strings.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {(value: string | null) => unknown} Deserializer function.
 */
function deserializeJson(logError) {
  return value => {
    if (value === null || value === undefined) {
      return null;
    }

    if (value === '') {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      logError('Failed to read permanent data:', error);
      return null;
    }
  };
}

/**
 * Creates a function that serializes values to JSON.
 * @param {(message: string, ...args: unknown[]) => void} logError - Error logger.
 * @returns {(value: unknown) => string | null} Serializer function.
 */
function serializeJson(logError) {
  return value => {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      logError('Failed to serialize JSON for storage:', error);
      return null;
    }
  };
}
