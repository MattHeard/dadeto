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
 * @param value
 * @returns {string} Normalized string value.
 */
function normalizeInput(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

/**
 *
 * @param env
 * @returns {((args: object) => unknown) | null} Storage helper when available.
 */
function getStorageFunction(env) {
  if (!env || typeof env.get !== 'function') {
    return null;
  }
  const storageFn = env.get('setLocalPermanentData');
  return typeof storageFn === 'function' ? storageFn : null;
}

/**
 *
 * @param storageFn
 * @returns {string} Stored list contents or empty string.
 */
function readExistingList(storageFn) {
  try {
    const existingData = storageFn({});
    const stored = existingData?.[TOY_KEY];
    return typeof stored === 'string' ? stored : '';
  } catch {
    return '';
  }
}

/**
 *
 * @param storageFn
 * @param list
 * @returns {void}
 */
function persistUpdatedList(storageFn, list) {
  try {
    storageFn({ [TOY_KEY]: list });
  } catch {
    // Ignore persistence errors while still returning the latest list.
  }
}
