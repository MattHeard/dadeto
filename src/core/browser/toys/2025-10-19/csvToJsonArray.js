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
  if (trimmedLines.length < 2) {
    return null;
  }

  const headers = parseHeaderRow(trimmedLines[0]);
  if (!headers) {
    return null;
  }

  const rows = [];
  for (const rawLine of trimmedLines.slice(1)) {
    const record = parseRecordLine(rawLine, headers);
    if (record === null) {
      return null;
    }
    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  return rows.length > 0 ? rows : null;
}

/**
 * Check if lines are sufficient.
 * @param {string[]} lines Lines.
 * @returns {boolean} True if sufficient.
 */
function removeTrailingEmptyLines(lines) {
  const lastIndex = findLastNonEmptyLineIndex(lines);
  if (lastIndex === -1) {
    return [];
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
 * Convert header tokens into metadata records used for column lookups.
 * @param {string[]} headers - Parsed header values.
 * @returns {Array<{ name: string, index: number }>} Metadata entries for non-empty headers.
 */
function parseHeaderRow(line) {
  const headerTokens = parseCsvLine(line.trim());
  if (!headerTokens) {
    return null;
  }

  const headers = headerTokens
    .map(token => token.trim())
    .filter(token => token.length > 0);

  return headers.length > 0 ? headers : null;
}

function parseRecordLine(rawLine, headers) {
  const normalizedLine = rawLine.trim();
  if (normalizedLine.length === 0) {
    return {};
  }

  const values = parseCsvLine(normalizedLine);
  if (!values) {
    return null;
  }

  return headers.reduce((record, header, index) => {
    const value = values[index];
    if (typeof value === 'string' && value.trim().length > 0) {
      record[header] = value.trim();
    }
    return record;
  }, /** @type {Record<string, string>} */ ({}));
}
