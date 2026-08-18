import { parseCsvLine } from './toys-core.js';
import { isBlankStringValue } from '../../browser-core.js';

/**
 * Convert a multi-row CSV string into a JSON array string.
 * Rows with parsing errors invalidate the entire operation.
 * @param {string} input - CSV text with a header row followed by data rows.
 * @returns {string} Stringified JSON array built from the CSV input.
 */
export function csvToJsonArrayToy(input) {
  const rows = extractCsvRows(input);
  return JSON.stringify(rows ?? []);
}

/**
 * Extract row objects from the provided CSV text, returning `null` when parsing fails.
 * @param {string} input - Raw CSV text that should contain a header row followed by data rows.
 * @returns {Array<Record<string, string>>|null} Parsed row objects or null when the input is invalid.
 */
function extractCsvRows(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmedLines = removeTrailingEmptyLines(
    input.replace(/\r\n?/g, '\n').split('\n')
  );
  if (trimmedLines === null) {
    return null;
  }
  const [headerLine, ...dataLines] = trimmedLines;

  const headers = parseHeaderRow(headerLine);
  if (!headers) {
    return null;
  }

  const rows = [];
  for (const rawLine of dataLines) {
    const record = parseRecordLine(rawLine, headers);
    if (record === null) {
      return null;
    }
    if (record !== undefined && Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return rows;
}

/**
 * Remove any trailing blank lines.
 * @param {string[]} lines Lines.
 * @returns {string[] | null} Trimmed lines, or null when all lines are blank.
 */
function removeTrailingEmptyLines(lines) {
  const lastIndex = findLastNonEmptyLineIndex(lines);
  if (lastIndex === -1) {
    return null;
  }

  return lines.slice(0, lastIndex + 1);
}

/**
 * Locate the last index containing a non-empty line.
 * @param {string[]} lines - Candidate lines to inspect.
 * @returns {number} Last index where the line is not empty, otherwise -1.
 */
function findLastNonEmptyLineIndex(lines) {
  return lines.findLastIndex(
    (/** @type {string} */ line) => !isBlankStringValue(line)
  );
}

/**
 * Parse and normalize the CSV header row.
 * @param {string} line - First CSV line.
 * @returns {string[] | null} Parsed header names or null on invalid input.
 */
function parseHeaderRow(line) {
  const headerTokens = parseCsvLine(line);
  if (!headerTokens) {
    return null;
  }

  const headers = headerTokens
    .map(token => token.trim())
    .filter(token => token.length > 0);

  if (headers.length === 0) {
    return null;
  }

  return headers;
}

/**
 * Parse one data row against the header names.
 * @param {string} rawLine - CSV data line.
 * @param {string[]} headers - Header names.
 * @returns {Record<string, string> | null | undefined} Parsed row object, null on invalid input, or undefined for a blank row.
 */
function parseRecordLine(rawLine, headers) {
  const normalizedLine = rawLine.trim();
  if (normalizedLine.length === 0) {
    return undefined;
  }

  const values = parseCsvLine(normalizedLine);
  if (!values) {
    return null;
  }

  /** @type {Record<string, string>} */
  const record = {};
  headers.forEach((header, index) => {
    const value = values[index];
    if (typeof value === 'string' && value.trim().length > 0) {
      record[header] = value.trim();
    }
  });
  return record;
}

export const csvToJsonArrayTestUtils = {
  extractCsvRows,
  removeTrailingEmptyLines,
  findLastNonEmptyLineIndex,
  parseHeaderRow,
  parseRecordLine,
};
