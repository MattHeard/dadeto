// Toy: Generate Blog Key
// (input, env) -> string

import { parseExistingKeys } from '../../browser-core.js';

const EMPTY_RESULT = JSON.stringify('');

/**
 * Extract the first `count` letter characters from a string, uppercased.
 * @param {string} title - Blog post title.
 * @param {number} count - Number of letter characters to extract.
 * @returns {string} Uppercase letter prefix.
 */
function extractLetterPrefix(title, count) {
  return title
    .split('')
    .filter(c => /[a-zA-Z]/.test(c))
    .slice(0, count)
    .join('')
    .toUpperCase();
}

/**
 * Find the lowest unused number suffix for a given prefix.
 * @param {string} prefix - 4-letter uppercase prefix.
 * @param {Set<string>} keySet - Set of existing keys.
 * @returns {string} New unique key.
 */
function findUniqueKey(prefix, keySet) {
  let n = 1;
  while (keySet.has(prefix + n)) {
    n++;
  }
  return prefix + n;
}

/**
 * Return true when the parsed value has a string title field.
 * @param {unknown} parsed - Value to check.
 * @returns {boolean} Whether parsed is a valid input object.
 */
function isValidParsed(parsed) {
  return (
    Boolean(parsed) && typeof (/** @type {any} */ (parsed).title) === 'string'
  );
}

/**
 * Build a unique key from a prefix and list of existing keys.
 * @param {string} prefix - Letter prefix extracted from title.
 * @param {unknown[]} existingKeys - List of keys already in use.
 * @returns {string} JSON string of the new key, or empty string if prefix too short.
 */
function buildKeyFromPrefix(prefix, existingKeys) {
  if (prefix.length < 4) {
    return EMPTY_RESULT;
  }
  return JSON.stringify(findUniqueKey(prefix, /** @type {Set<string>} */ (new Set(existingKeys))));
}

/**
 * Build a unique key from a parsed input object.
 * @param {unknown} parsed - Parsed JSON input.
 * @returns {string} JSON string of the new key, or empty string on invalid input.
 */
function buildKeyFromParsed(parsed) {
  if (!isValidParsed(parsed)) {
    return EMPTY_RESULT;
  }
  const obj = /** @type {any} */ (parsed);
  return buildKeyFromPrefix(
    extractLetterPrefix(obj.title, 4),
    parseExistingKeys(obj)
  );
}

/**
 * Generate a unique blog key from a title and list of existing keys.
 * @param {string} input - JSON string with `title` and `existingKeys`.
 * @param {Map<string, Function>} env - Environment (unused).
 * @returns {string} JSON string of the new key, or empty string on error.
 */
export function generateBlogKey(input, env) {
  void env;
  try {
    return buildKeyFromParsed(JSON.parse(input));
  } catch {
    return EMPTY_RESULT;
  }
}
