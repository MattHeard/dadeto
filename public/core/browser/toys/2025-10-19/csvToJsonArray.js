/**
 * CSV to JSON Array Toy
 * ----------------------------------------------------------
 * Converts a CSV string containing a header row and one or more data rows into
 * a JSON array string. Each data row becomes an object whose keys are sourced
 * from the header. Empty values are omitted from the resulting objects.
 */

import { parseCsvLine } from './toys-core.js';

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
  const trimmedLines = removeTrailingEmptyLines(normalizedInput.split('\n'));

  if (trimmedLines.length < 2) {
    return JSON.stringify([]);
  }

  const headerInfo = parseHeaderEntries(trimmedLines);
  if (!headerInfo) {
    return JSON.stringify([]);
  }

  const rows = buildRows(headerInfo.dataLines, headerInfo.headerEntries);
  if (!rows || rows.length === 0) {
    return JSON.stringify([]);
  }

  return JSON.stringify(rows);
}

/**
 * Remove empty lines from the end of the provided array.
 * @param {string[]} lines - Raw CSV lines including potential trailing blanks.
 * @returns {string[]} A slice of the original lines without trailing blanks.
 */
function removeTrailingEmptyLines(lines) {
  let endIndex = lines.length - 1;
  while (endIndex >= 0 && lines[endIndex].trim().length === 0) {
    endIndex -= 1;
  }

  return lines.slice(0, endIndex + 1);
}

/**
 * Convert the header line into index/name pairs for later lookups.
 * @param {string[]} lines - Normalized CSV lines beginning with the header.
 * @returns {{headerEntries: Array<{name: string, index: number}>, dataLines: string[]}|null}
 * Returns header metadata plus remaining data lines, or null when parsing fails.
 */
function parseHeaderEntries(lines) {
  const [headerLine, ...dataLines] = lines;
  const trimmedHeader = headerLine.trim();
  if (!trimmedHeader) {
    return null;
  }

  const headers = parseCsvLine(trimmedHeader);
  if (!headers) {
    return null;
  }

  const headerEntries = headers
    .map((header, index) => ({ name: header.trim(), index }))
    .filter(entry => entry.name.length > 0);

  if (headerEntries.length === 0) {
    return null;
  }

  return { headerEntries, dataLines };
}

/**
 * Build JSON-ready row objects for each CSV data line.
 * @param {string[]} dataLines - Lines representing CSV records.
 * @param {Array<{name: string, index: number}>} headerEntries - Header metadata describing column order.
 * @returns {Array<Record<string, string>>|null} An array of row objects, or null when parsing fails.
 */
function buildRows(dataLines, headerEntries) {
  const rows = [];

  for (const rawLine of dataLines) {
    if (rawLine.trim().length === 0) {
      continue;
    }

    const values = parseCsvLine(rawLine.trimEnd());
    if (!values) {
      return null;
    }

    const record = {};
    for (const { name, index } of headerEntries) {
      const value = String(values[index] ?? '').trim();
      if (value.length > 0) {
        record[name] = value;
      }
    }

    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  return rows;
}
