// Toy: Generate Blog Key
// (input, env) -> string

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
 * Generate a unique blog key from a title and list of existing keys.
 * @param {string} input - JSON string with `title` and `existingKeys`.
 * @param {Map<string, Function>} env - Environment (unused).
 * @returns {string} JSON string of the new key, or empty string on error.
 */
export function generateBlogKey(input, env) {
  void env;
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed.title !== 'string') {
      return JSON.stringify('');
    }
    const prefix = extractLetterPrefix(parsed.title, 4);
    if (prefix.length < 4) {
      return JSON.stringify('');
    }
    const existingKeys = Array.isArray(parsed.existingKeys)
      ? parsed.existingKeys
      : [];
    const keySet = new Set(existingKeys);
    return JSON.stringify(findUniqueKey(prefix, keySet));
  } catch {
    return JSON.stringify('');
  }
}
