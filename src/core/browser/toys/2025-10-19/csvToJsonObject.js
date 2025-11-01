/**
 * CSV to JSON Object Toy
 * ----------------------------------------------------------
 * Converts a two-line CSV string (header + single data row) into a JSON object
 * string. Empty values are omitted from the result.
 */

import { parseCsvLine } from './toys-core.js';

/**
 * Throw a descriptive error when a CSV precondition fails.
 * @param {boolean} condition Assertion to validate.
 * @returns {void}
 */
function assertCsv(condition) {
  if (!condition) {
    throw new Error('Invalid CSV input');
  }
}

/**
 * Create filtered key/value tuples from header and value arrays.
 * @param {string[]} headers Parsed CSV header values.
 * @param {string[]} values Parsed CSV row values.
 * @returns {Array<[string, string]>} Filtered header/value pairs.
 */
function zipHeadersWithValues(headers, values) {
  return headers
    .map((header, index) => [header.trim(), (values[index] ?? '').trim()])
    .filter(([header, value]) => header.length > 0 && value.length > 0);
}

/**
 * Transform a normalized two-line CSV string into an object.
 * @param {string} input CSV text that should include a header and data row.
 * @returns {Record<string, string>} Object representation of the CSV data.
 */
function buildObjectFromCsv(input) {
  assertCsv(typeof input === 'string');

  const normalizedInput = input.replace(/\r\n?/g, '\n').trimEnd();
  assertCsv(normalizedInput.length > 0);

  const newlineIndex = normalizedInput.indexOf('\n');
  assertCsv(newlineIndex !== -1);

  const headerLine = normalizedInput.slice(0, newlineIndex).trim();
  const remaining = normalizedInput.slice(newlineIndex + 1);
  assertCsv(headerLine.length > 0);
  assertCsv(remaining.length > 0);

  const [dataLine, ...rest] = remaining.split('\n');
  assertCsv(Boolean(dataLine));
  assertCsv(!rest.some(line => line.trim().length > 0));

  const headers = parseCsvLine(headerLine);
  const values = parseCsvLine(dataLine.trimEnd());
  assertCsv(Array.isArray(headers));
  assertCsv(Array.isArray(values));

  const entries = zipHeadersWithValues(headers, values);

  return Object.fromEntries(entries);
}

/**
 * Convert a single-row CSV string into a JSON object string.
 * Columns without a value in the data row are omitted from the result.
 * @param {string} input - CSV text with exactly two logical lines.
 * @param {Map<string, Function>} [env] - Environment helpers (unused).
 * @returns {string} Stringified JSON object built from the CSV input.
 */
export function csvToJsonObjectToy(input, env) {
  void env;

  try {
    return JSON.stringify(buildObjectFromCsv(input));
  } catch (error) {
    void error;
    return JSON.stringify({});
  }
}
