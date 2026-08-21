import { whenString } from '../../../commonCore.js';

const SURROUNDING_STRIP_CHARS = /^[()[\]{}"'.,!?:;]+|[()[\]{}"'.,!?:;]+$/g;

/**
 * Normalize the provided string by lowercasing, trimming, and collapsing whitespace.
 * Umlauts and ß remain untouched because JavaScript toLowerCase preserves them.
 * @param {string} s - Raw string input.
 * @returns {string} Normalized string ready for further token operations.
 */
export function normalizeText(s) {
  if (typeof s !== 'string') {
    return '';
  }

  return s.trim().split(/\s+/).join(' ').toLowerCase();
}

/**
 * Check whether the first character of a token is a strip character.
 * @param {string} token - Non-empty token string.
 * @returns {boolean} True when the leading character should be stripped.
 */
/**
 * Repeatedly strip leading and trailing punctuation until the token stabilises.
 * @param {string} token - Lowercased, trimmed token.
 * @returns {string} Token with all surrounding punctuation removed.
 */
function stripSurroundingPunctuation(token) {
  return token.replace(SURROUNDING_STRIP_CHARS, '');
}

/**
 * Normalize a single token by lowercasing and stripping surrounding punctuation.
 * Internal hyphens and apostrophes are preserved.
 * @param {string} t - Candidate token extracted from the input.
 * @returns {string} Normalized token or an empty string when nothing remains.
 */
export function normalizeToken(t) {
  if (typeof t !== 'string') {
    return '';
  }

  return stripSurroundingPunctuation(t.trim().toLowerCase());
}

/**
 * Simple German surface tokenizer toy for the browser.
 * Splits the input text on whitespace, normalizes each token, discards empties,
 * and returns a JSON array string.
 * @param {string} input - Raw input string provided by the toy UI.
 * @returns {string} JSON string of normalized surface tokens.
 */
export function germanTokenizerToy(input) {
  const normalizedInput = (whenString(input, s => s) ?? '').trim();
  const tokens = normalizedInput ? normalizedInput.split(/\s+/) : [];
  const normalizedTokens = tokens.map(normalizeToken);
  return JSON.stringify(normalizedTokens);
}
