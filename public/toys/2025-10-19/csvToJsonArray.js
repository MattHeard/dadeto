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
  const rows = extractCsvRows(input);
  return JSON.stringify(rows ?? []);
}

/**
 * Extract row objects from the provided CSV text, returning `null` when parsing fails.
 * @param {string} input - Raw CSV text that should contain a header row followed by data rows.
 * @returns {Array<Record<string, string>>|null} Parsed row objects or null when the input is invalid.
 */
function extractCsvRows(input) {
  const trimmedLines = normalizeInputLines(input);
  if (!trimmedLines) {
    return null;
  }

  return buildRowsFromLines(trimmedLines);
}

/**
 * Normalize the incoming CSV text into trimmed lines.
 * @param {string} input - Raw CSV text.
 * @returns {string[]|null} Trimmed lines when there are at least two rows, otherwise null.
 */
function normalizeInputLines(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const normalizedInput = input.replace(/\r\n?/g, '\n');
  const trimmedLines = removeTrailingEmptyLines(normalizedInput.split('\n'));

  if (trimmedLines.length < 2) {
    return null;
  }

  return trimmedLines;
}

/**
 * Build row objects when header metadata is available.
 * @param {string[]} trimmedLines - Normalized CSV lines with at least a header row.
 * @returns {Array<Record<string, string>>|null} Row objects or null when parsing fails.
 */
function buildRowsFromLines(trimmedLines) {
  const headerInfo = parseHeaderEntries(trimmedLines);
  let rows = null;
  if (headerInfo) {
    rows = buildRows(headerInfo.dataLines, headerInfo.headerEntries);
  }

  if (rows?.length) {
    return rows;
  }

  return null;
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
    const record = createRecordForLine(rawLine, headerEntries);
    if (record === null) {
      return null;
    }

    if (record && Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  return rows;
}

/**
 * Build a record for a single CSV line using the supplied headers.
 * @param {string} rawLine - Raw data line read from the CSV input.
 * @param {Array<{name: string, index: number}>} headerEntries - Header metadata for column lookups.
 * @returns {Record<string, string> | undefined | null} Record when parsing succeeds, `undefined` when empty, or `null` when invalid.
 */
function createRecordForLine(rawLine, headerEntries) {
  const normalizedLine = normalizeDataLine(rawLine);
  if (!normalizedLine) {
    return undefined;
  }

  return buildRecordFromLine(normalizedLine, headerEntries);
}

/**
 * Normalize an individual CSV line by trimming trailing whitespace.
 * @param {string} rawLine - Data line read from the CSV input.
 * @returns {string|null} Trimmed line or null when it is empty.
 */
function normalizeDataLine(rawLine) {
  if (rawLine.trim().length === 0) {
    return null;
  }

  return rawLine.trimEnd();
}

/**
 * Build a single record from a parsed CSV line using the provided headers.
 * @param {string} line - A normalized CSV data line.
 * @param {Array<{name: string, index: number}>} headerEntries - Header metadata.
 * @returns {Record<string, string>|null} Record object or null when parsing fails.
 */
function buildRecordFromLine(line, headerEntries) {
  const values = parseCsvLine(line);
  if (!values) {
    return null;
  }

  const record = {};
  headerEntries.forEach(entry => assignRecordValue(record, entry, values));

  return record;
}

/**
 * Assign a cell value to the record when the parsed value is not empty.
 * @param {Record<string, string>} record - Target record collecting field values.
 * @param {{ name: string, index: number }} column - Header metadata describing the column.
 * @param {Array<string>} values - Parsed CSV values for the row.
 * @returns {void}
 */
function assignRecordValue(record, { name, index }, values) {
  const value = String(values[index] ?? '').trim();
  if (value.length > 0) {
    record[name] = value;
  }
}
