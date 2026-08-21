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
  const suffix = Array.from({ length: keySet.size + 1 }, (_, index) => index + 1)
    .find(candidate => !keySet.has(prefix + candidate));
  return prefix + (suffix ?? keySet.size + 1);
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
  return JSON.stringify(
    findUniqueKey(prefix, /** @type {Set<string>} */ (new Set(existingKeys)))
  );
}

/**
 * Build a unique key from a parsed input object.
 * @param {unknown} parsed - Parsed JSON input.
 * @returns {string} JSON string of the new key, or empty string on invalid input.
 */
function buildKeyFromParsed(parsed) {
  const obj = /** @type {{ title: string, existingKeys?: unknown[] }} */ (
    parsed
  );
  return buildKeyFromPrefix(
    extractLetterPrefix(obj.title, 4),
    parseExistingKeys(obj)
  );
}

/**
 * Generate a unique blog key from a title and list of existing keys.
 * @param {string} input - JSON string with `title` and `existingKeys`.
 * @returns {string} JSON string of the new key, or empty string on error.
 */
export function generateBlogKey(input) {
  try {
    return buildKeyFromParsed(JSON.parse(input));
  } catch {
    return EMPTY_RESULT;
  }
}
