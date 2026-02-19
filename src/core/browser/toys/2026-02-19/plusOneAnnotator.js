import { normalizeToken } from './germanTokenizer.js';
import { whenString } from '../../../commonCore.js';
import { buildWhen } from '../../common.js';
import { isPlainObject } from '../browserToysCore.js';

/**
 * Convert a value into a string when available.
 * @param {unknown} value - Candidate value.
 * @returns {string} String value or empty string.
 */
function toStringOrEmpty(value) {
  const candidate = whenString(value, s => s);
  if (candidate === null) {
    return '';
  }

  return candidate;
}

/**
 * Parse the toy input JSON into a payload.
 * @param {unknown} input - Raw input argument provided to the toy.
 * @returns {Record<string, unknown> | null} Parsed object or null when parsing fails.
 */
/**
 * Try to JSON-parse a raw string, returning null on failure.
 * @param {string} raw - Raw JSON string.
 * @returns {unknown} Parsed value or null.
 */
function tryParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Parse the toy input JSON into a payload.
 * @param {unknown} input - Raw input argument provided to the toy.
 * @returns {Record<string, unknown> | null} Parsed object or null when parsing fails.
 */
function parseToyInput(input) {
  const raw = whenString(input, s => s);
  if (raw === null) {
    return null;
  }

  const parsed = tryParse(raw);
  return buildWhen(
    isPlainObject(parsed),
    () => /** @type {Record<string, unknown>} */ (parsed)
  );
}

/**
 * Normalise the provided sentence into tokens.
 * @param {string} sentence - Raw sentence text.
 * @returns {string[]} Normalised tokens.
 */
function getTokens(sentence) {
  const segments =
    buildWhen(sentence.length > 0, () => sentence.split(/\s+/)) ?? [];
  return segments.map(normalizeToken).filter(Boolean);
}

/**
 * Build a set of normalised known words from a newline-delimited string.
 * @param {string} knownWords - Newline-delimited known words.
 * @returns {Set<string>} Known-word set.
 */
function buildKnownWordSet(knownWords) {
  const lines =
    buildWhen(knownWords.length > 0, () => knownWords.split(/\r?\n/)) ?? [];
  const acc = new Set();
  lines.forEach(line => {
    const normalised = normalizeToken(line);
    if (!normalised) {
      return;
    }

    acc.add(normalised);
  });

  return acc;
}

/**
 * Collect tokens not present in the known-word set.
 * @param {string[]} tokens - Normalised sentence tokens.
 * @param {Set<string>} knownWordSet - Set of known surface forms.
 * @returns {string[]} Unknown tokens.
 */
function collectUnknownTokens(tokens, knownWordSet) {
  const unknownTokens = [];
  tokens.forEach(token => {
    if (knownWordSet.has(token)) {
      return;
    }

    unknownTokens.push(token);
  });

  return unknownTokens;
}

/**
 * Annotate a German sentence with unknown token counts and +1 status.
 * Accepts a kv input with 'sentence' and 'knownWords' fields.
 * @param {string} input - Serialised toy input (JSON from kv form).
 * @param {Map<string, unknown>} env - Toy environment (unused).
 * @returns {string} JSON string describing tokens and annotations.
 */
export function plusOneAnnotatorToy(input, env) {
  void env;

  const payload = parseToyInput(input);
  if (payload === null) {
    return JSON.stringify({ error: 'Invalid input' });
  }

  const sentence = toStringOrEmpty(payload.sentence);
  const knownWords = toStringOrEmpty(payload.knownWords);
  const tokens = getTokens(sentence);
  const knownWordSet = buildKnownWordSet(knownWords);
  const unknownTokens = collectUnknownTokens(tokens, knownWordSet);

  return JSON.stringify({
    tokens,
    unknownTokens,
    unknownCount: unknownTokens.length,
    isPlusOne: unknownTokens.length === 1,
  });
}
