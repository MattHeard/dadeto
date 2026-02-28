import { whenString } from '../../../commonCore.js';
import { withFallback } from '../../common.js';

const STRIP_CHARS = new Set([
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '"',
  "'",
  ',',
  '.',
  '!',
  '?',
  ':',
  ';',
]);

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

  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Check whether the first character of a token is a strip character.
 * @param {string} token - Non-empty token string.
 * @returns {boolean} True when the leading character should be stripped.
 */
function hasLeadingStripChar(token) {
  return Boolean(token) && STRIP_CHARS.has(token[0]);
}

/**
 * Strip a single leading strip character from the token if present.
 * @param {string} token - Current token string.
 * @returns {string} Token with leading strip character removed.
 */
function stripLeading(token) {
  return withFallback(hasLeadingStripChar(token), () => token.slice(1), token);
}

/**
 * Check whether the last character of a token is a strip character.
 * @param {string} token - Non-empty token string.
 * @returns {boolean} True when the trailing character should be stripped.
 */
function hasTrailingStripChar(token) {
  return Boolean(token) && STRIP_CHARS.has(token[token.length - 1]);
}

/**
 * Strip a single trailing strip character from the token if present.
 * @param {string} token - Current token string.
 * @returns {string} Token with trailing strip character removed.
 */
function stripTrailing(token) {
  return withFallback(
    hasTrailingStripChar(token),
    () => token.slice(0, -1),
    token
  );
}

/**
 * Repeatedly strip leading and trailing punctuation until the token stabilises.
 * @param {string} token - Lowercased, trimmed token.
 * @returns {string} Token with all surrounding punctuation removed.
 */
function stripSurroundingPunctuation(token) {
  let current = token;
  let next = stripTrailing(stripLeading(current));

  while (next !== current) {
    current = next;
    next = stripTrailing(stripLeading(current));
  }

  return current;
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
 * @param {Map<string, unknown>} env - Toy environment (unused).
 * @returns {string} JSON string of normalized surface tokens.
 */
export function germanTokenizerToy(input, env) {
  void env;

  const tokens = (whenString(input, s => s) ?? '').split(/\s+/);
  const normalizedTokens = tokens.map(normalizeToken).filter(Boolean);
  return JSON.stringify(normalizedTokens);
}
