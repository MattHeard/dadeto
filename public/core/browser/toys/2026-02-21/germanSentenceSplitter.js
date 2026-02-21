import { whenString } from '../../../commonCore.js';

/**
 * Abbreviations whose trailing period must not be treated as a sentence boundary.
 * Each entry is the abbreviation stem without its trailing period.
 */
const ABBREVIATIONS = [
  'z.B',
  'u.a',
  'd.h',
  'usw',
  'bzw',
  'Dr',
  'Prof',
  'ca',
  'Nr',
  'Str',
  'etc',
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

/**
 * Placeholder replacing abbreviation periods so they survive sentence splitting.
 * Middle dot (U+00B7) is not normally present in German prose.
 */
const PLACEHOLDER = '\u00B7';

/**
 * Escape special regex characters in a literal string.
 * @param {string} s - String to escape.
 * @returns {string} Regex-safe string.
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace the trailing period of each known abbreviation with a placeholder.
 * @param {string} text - Input text.
 * @returns {string} Text with abbreviation periods protected.
 */
function protectAbbreviations(text) {
  return ABBREVIATIONS.reduce((acc, abbr) => {
    return acc.replace(
      new RegExp(`${escapeRegex(abbr)}\\.`, 'g'),
      abbr + PLACEHOLDER
    );
  }, text);
}

/**
 * Restore placeholder characters to periods.
 * @param {string} text - Text with placeholders.
 * @returns {string} Original text with periods restored.
 */
function restoreAbbreviations(text) {
  return text.replace(new RegExp(PLACEHOLDER, 'g'), '.');
}

/**
 * Split text at sentence boundaries.
 * A boundary is a .!? followed by whitespace and an uppercase letter or opening quote.
 * @param {string} text - Text with abbreviation periods already protected.
 * @returns {string[]} Raw sentence fragments, still containing placeholders.
 */
function splitOnBoundaries(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ"„«])/);
}

/**
 * Split a German text into individual sentences.
 * @param {string} text - Raw German text (may be multiple paragraphs).
 * @returns {string[]} Array of trimmed, non-empty sentence strings.
 */
function splitSentences(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return [];
  }

  const protected_ = protectAbbreviations(normalized);
  const parts = splitOnBoundaries(protected_);
  return parts.map(part => restoreAbbreviations(part.trim())).filter(Boolean);
}

/**
 * German sentence splitter toy.
 * Splits a paragraph of German text into individual sentences and returns
 * a JSON array of strings.
 * @param {string} input - Raw German text from the textarea input.
 * @param {Map<string, unknown>} env - Toy environment (unused).
 * @returns {string} JSON array of sentence strings.
 */
export function germanSentenceSplitterToy(input, env) {
  void env;

  const text = whenString(input, s => s) ?? '';
  const sentences = splitSentences(text);
  return JSON.stringify(sentences);
}
