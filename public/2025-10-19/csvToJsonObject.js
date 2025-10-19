/**
 * CSV to JSON Object Toy
 * ----------------------------------------------------------
 * Converts a two-line CSV string (header + single data row) into a JSON object
 * string. Empty values are omitted from the result.
 */

import { parseCsvLine } from '../utils/csv.js';

/**
 * Convert a single-row CSV string into a JSON object string.
 * Columns without a value in the data row are omitted from the result.
 * @param {string} input - CSV text with exactly two logical lines.
 * @param {Map<string, Function>} [env] - Environment helpers (unused).
 * @returns {string} Stringified JSON object built from the CSV input.
 */
export function csvToJsonObjectToy(input, env) {
  void env;
  if (typeof input !== 'string') {
    return JSON.stringify({});
  }

  const normalizedInput = input.replace(/\r\n?/g, '\n').trimEnd();
  if (!normalizedInput) {
    return JSON.stringify({});
  }

  const newlineIndex = normalizedInput.indexOf('\n');
  if (newlineIndex === -1) {
    return JSON.stringify({});
  }

  const headerLine = normalizedInput.slice(0, newlineIndex).trim();
  const remaining = normalizedInput.slice(newlineIndex + 1);
  if (!headerLine || !remaining) {
    return JSON.stringify({});
  }

  const [dataLine, ...rest] = remaining.split('\n');
  const hasExtraContent = rest.some(line => line.trim().length > 0);
  if (!dataLine || hasExtraContent) {
    return JSON.stringify({});
  }

  const headers = parseCsvLine(headerLine);
  const values = parseCsvLine(dataLine.trimEnd());
  if (!headers || !values) {
    return JSON.stringify({});
  }

  const trimmedHeaders = headers.map(header => header.trim()).filter(Boolean);
  const result = {};

  trimmedHeaders.forEach((header, index) => {
    const rawValue = values[index] ?? '';
    const value = rawValue.trim();
    if (value.length > 0) {
      result[header] = value;
    }
  });

  return JSON.stringify(result);
}
