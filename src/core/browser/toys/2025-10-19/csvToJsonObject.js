/**
 * CSV to JSON Object Toy
 * ----------------------------------------------------------
 * Converts a two-line CSV string (header + single data row) into a JSON object
 * string. Empty values are omitted from the result.
 */

import { parseCsvLine } from './toys-core.js';
import { runToyWithFallback } from '../browserToysCore.js';

/**
 * Create filtered key/value tuples from header and value arrays.
 * @param {string[]} headers Parsed CSV header values.
 * @param {string[]} values Parsed CSV row values.
 * @returns {Array<[string, string]>} Filtered header/value pairs.
 */
function zipHeadersWithValues(headers, values) {
  return headers
    .map((header, index) => {
      const entry = [header.trim(), (values[index] ?? '').trim()];
      return /** @type {[string, string]} */ (entry);
    })
    .filter(([header, value]) => header.length > 0 && value.length > 0);
}

/**
 * Transform a normalized two-line CSV string into an object.
 * @param {string} input CSV text that should include a header and data row.
 * @returns {Record<string, string>} Object representation of the CSV data.
 */
function buildObjectFromCsv(input) {
  const normalizedInput = input.replace(/\r\n?/g, '\n');

  const [headerLineRaw, dataLine, ...rest] = normalizedInput.split('\n');
  const headerLine = headerLineRaw;
  if (rest.some(line => line.trim().length > 0)) {
    return {};
  }

  const headersCandidate = parseCsvLine(headerLine);
  const valuesCandidate = parseCsvLine(dataLine);
  const headers = /** @type {string[]} */ (headersCandidate);
  const values = /** @type {string[]} */ (valuesCandidate);

  const entries = zipHeadersWithValues(headers, values);

  return Object.fromEntries(entries);
}

/**
 * Convert a single-row CSV string into a JSON object string.
 * Columns without a value in the data row are omitted from the result.
 * @param {string} input - CSV text with exactly two logical lines.
 * @returns {string} Stringified JSON object built from the CSV input.
 */
export function csvToJsonObjectToy(input) {
  return runToyWithFallback(
    input,
    value => JSON.stringify(buildObjectFromCsv(value)),
    JSON.stringify({})
  );
}
