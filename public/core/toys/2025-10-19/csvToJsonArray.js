/**
 * CSV to JSON Array Toy
 * ----------------------------------------------------------
 * Converts a CSV string containing a header row and one or more data rows into
 * a JSON array string. Each data row becomes an object whose keys are sourced
 * from the header. Empty values are omitted from the resulting objects.
 */

import { parseCsvLine } from '../utils/csv.js';

/**
 * Convert a multi-row CSV string into a JSON array string.
 * Rows with parsing errors invalidate the entire operation.
 * @param {string} input - CSV text with a header row followed by data rows.
 * @param {Map<string, Function>} [env] - Environment helpers (unused).
 * @returns {string} Stringified JSON array built from the CSV input.
 */
export function csvToJsonArrayToy(input, env) {
  void env;
  if (typeof input !== 'string') {
    return JSON.stringify([]);
  }

  const normalizedInput = input.replace(/\r\n?/g, '\n');
  const lines = normalizedInput.split('\n');

  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }

  if (lines.length < 2) {
    return JSON.stringify([]);
  }

  const headerLine = lines[0].trim();
  if (!headerLine) {
    return JSON.stringify([]);
  }

  const headers = parseCsvLine(headerLine);
  if (!headers) {
    return JSON.stringify([]);
  }

  const headerEntries = headers
    .map((header, index) => ({ name: header.trim(), index }))
    .filter(entry => entry.name.length > 0);

  if (headerEntries.length === 0) {
    return JSON.stringify([]);
  }

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (rawLine.trim().length === 0) {
      continue;
    }

    const values = parseCsvLine(rawLine.trimEnd());
    if (!values) {
      return JSON.stringify([]);
    }

    const record = {};
    headerEntries.forEach(({ name, index }) => {
      const rawValue = values[index] ?? '';
      const value = rawValue.trim();
      if (value.length > 0) {
        record[name] = value;
      }
    });

    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  if (rows.length === 0) {
    return JSON.stringify([]);
  }

  return JSON.stringify(rows);
}
