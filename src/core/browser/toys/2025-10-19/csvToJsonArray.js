/**
 * CSV to JSON Array Toy
 * ----------------------------------------------------------
 * Converts a CSV string containing a header row and one or more data rows into
 * a JSON array string. Each data row becomes an object whose keys are sourced
 * from the header. Empty values are omitted from the resulting objects.
 */

import { parseCsvLine } from './toys-core.js';
import { buildWhen } from '../../common.js';
import { whenString } from '../../../common-core.js';

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
 * Check if lines are sufficient.
 * @param {string[]} lines Lines.
 * @returns {boolean} True if sufficient.
 */
function areLinesufficient(lines) {
  return lines.length >= 2;
}

/**
 * Normalize the incoming CSV text into trimmed lines when the input is a string.
 * @param {string} input - Raw CSV text.
 * @returns {string[]|null} Trimmed lines when there are at least two rows, otherwise null.
 */
function normalizeInputLines(input) {
  return whenString(input, getTrimmedLines);
}

/**
 * Produce trimmed CSV lines with at least two rows after removing trailing blanks.
 * @param {string} input - Raw CSV text normalized for line breaks.
 * @returns {string[]|null} Trimmed lines when there are at least two rows, otherwise null.
 */
function getTrimmedLines(input) {
  const normalizedInput = input.replace(/\r\n?/g, '\n');
  const trimmedLines = removeTrailingEmptyLines(normalizedInput.split('\n'));

  if (!areLinesufficient(trimmedLines)) {
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
  if (!headerInfo) {
    return null;
  }

  return getRowsFromHeaderInfo(headerInfo);
}

/**
 * Check if rows exist.
 * @param {Array<Record<string, string>>|null} rows Rows.
 * @returns {boolean} True if exist.
 */
function doRowsExist(rows) {
  return rows?.length > 0;
}

/**
 * Build rows once header parsing succeeded and rows exist.
 * @param {{
 *   dataLines: string[],
 *   headerEntries: Array<{ name: string, index: number }>
 * }} headerInfo - Parsed header metadata with remaining data lines.
 * @returns {Array<Record<string, string>>|null} Parsed row objects or null when none could be built.
 */
function getRowsFromHeaderInfo({ dataLines, headerEntries }) {
  const rows = buildRows(dataLines, headerEntries);

  if (!doRowsExist(rows)) {
    return null;
  }

  return rows;
}

/**
 * Check if line is empty.
 * @param {string} line Line.
 * @returns {boolean} True if empty.
 */
function isLineEmpty(line) {
  return line.trim().length === 0;
}

/**
 * Remove empty lines from the end of the provided array.
 * @param {string[]} lines - Raw CSV lines including potential trailing blanks.
 * @returns {string[]} A slice of the original lines without trailing blanks.
 */
function removeTrailingEmptyLines(lines) {
  const lastIndex = lines.findLastIndex(line => !isLineEmpty(line));
  if (lastIndex === -1) {
    return [];
  }

  return lines.slice(0, lastIndex + 1);
}

/**
 * Convert header tokens into metadata records used for column lookups.
 * @param {string[]} headers - Parsed header values.
 * @returns {Array<{ name: string, index: number }>} Metadata entries for non-empty headers.
 */
function buildHeaderEntries(headers) {
  return headers
    .map((header, index) => ({ name: header.trim(), index }))
    .filter(entry => entry.name.length > 0);
}

/**
 * Check if header entries exist.
 * @param {Array} entries Entries.
 * @returns {boolean} True if exist.
 */
function doHeaderEntriesExist(entries) {
  return entries.length > 0;
}

/**
 * Parse header entries from normalized CSV lines.
 * @param {string[]} lines - Normalized CSV lines beginning with the header row.
 * @returns {{headerEntries: Array<{name: string, index: number}>, dataLines: string[]} | null} Header metadata and remaining data lines when the header is valid, otherwise null.
 */
function parseHeaderEntries(lines) {
  const parsedHeader = getParsedHeaderLines(lines);
  if (!parsedHeader) {
    return null;
  }

  return buildHeaderEntriesResult(parsedHeader);
}

/**
 * Build header metadata when entries exist.
 * @param {{ headers: string[], dataLines: string[] }} parsedHeader - Parsed header tokens and remaining lines.
 * @returns {{headerEntries: Array<{name: string, index: number}>, dataLines: string[]} | null} Header metadata and data lines when the header entries exist, otherwise null.
 */
function buildHeaderEntriesResult(parsedHeader) {
  const headerEntries = buildHeaderEntries(parsedHeader.headers);
  return buildWhen(doHeaderEntriesExist(headerEntries), () => ({
    headerEntries,
    dataLines: parsedHeader.dataLines,
  }));
}

/**
 * Parse header and data lines when trimming succeeds.
 * @param {string[]} lines - Normalized CSV lines including the header row.
 * @returns {{ headers: string[], dataLines: string[] } | null} Parsed header tokens and remaining data lines when available.
 */
function getParsedHeaderLines(lines) {
  const [headerLine, ...dataLines] = lines;
  const trimmedHeader = getTrimmedHeaderLine(headerLine);
  if (!trimmedHeader) {
    return null;
  }

  return getParsedHeaders(trimmedHeader, dataLines);
}

/**
 * Get trimmed value.
 * @param {string} header Header.
 * @returns {string | null} Trimmed or null.
 */
function getTrimmedValue(header) {
  const trimmed = header.trim();
  return trimmed || null;
}

/**
 * Trim the header line before parsing.
 * @param {string | undefined} headerLine - Raw header text from the CSV input.
 * @returns {string|null} Trimmed header string when content exists, otherwise null.
 */
function getTrimmedHeaderLine(headerLine) {
  if (!headerLine) {
    return null;
  }

  return getTrimmedValue(headerLine);
}

/**
 * Parse the trimmed header into individual tokens.
 * @param {string} trimmedHeader - Header line without leading/trailing whitespace.
 * @param {string[]} dataLines - Remaining lines representing data rows.
 * @returns {{ headers: string[], dataLines: string[] } | null} Header tokens and untouched data lines, or null when parsing fails.
 */
function getParsedHeaders(trimmedHeader, dataLines) {
  const headers = parseCsvLine(trimmedHeader);
  if (!headers) {
    return null;
  }

  return { headers, dataLines };
}

/**
 * Check if record is invalid.
 * @param {unknown} record Record.
 * @returns {boolean} True if invalid.
 */
function isRecordInvalid(record) {
  return record === null;
}

/**
 * Build JSON-ready row objects for each CSV data line.
 * @param {string[]} dataLines - Lines representing CSV records.
 * @param {Array<{name: string, index: number}>} headerEntries - Header metadata describing column order.
 * @returns {Array<Record<string, string>>|null} An array of row objects, or null when parsing fails.
 */
function buildRows(dataLines, headerEntries) {
  const records = dataLines.map(rawLine =>
    createRecordForLine(rawLine, headerEntries)
  );

  if (records.some(isRecordInvalid)) {
    return null;
  }

  const rows = [];
  records.forEach(record => pushRecordIfNotEmpty(rows, record));

  return rows;
}

/**
 * Check if record has values.
 * @param {object} record Record.
 * @returns {boolean} True if has values.
 */
function doesRecordHaveValues(record) {
  return record && Object.keys(record).length > 0;
}

/**
 * Append parsed rows when the record contains data.
 * @param {Array<Record<string, string>>} rows - Collection being built.
 * @param {Record<string, string> | undefined | null} record - Parsed row data.
 * @returns {void}
 */
function pushRecordIfNotEmpty(rows, record) {
  if (doesRecordHaveValues(record)) {
    rows.push(record);
  }
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
 * Check if value is non-empty.
 * @param {string} value Value.
 * @returns {boolean} True if non-empty.
 */
function isValueNonEmpty(value) {
  return value.length > 0;
}

/**
 * Assign a cell value to the record when the parsed value is not empty.
 * @param {Record<string, string>} record - Target record collecting field values.
 * @param {{ name: string, index: number }} column - Header metadata describing the column.
 * @param {Array<string>} values - Parsed CSV values for the row.
 * @returns {void}
 */
function assignRecordValue(record, { name, index }, values) {
  assignParsedValue(record, name, values[index]);
}

/**
 *
 * @param record
 * @param name
 * @param rawValue
 */
/**
 * Assign a parsed and trimmed CSV cell value to the record when present.
 * @param {Record<string, string>} record - Target record collecting parsed fields.
 * @param {string} name - Field name derived from the header entry.
 * @param {unknown} rawValue - Value extracted from the parsed line.
 * @returns {void}
 */
function assignParsedValue(record, name, rawValue) {
  const value = normalizeCsvValue(rawValue);
  if (!isValueNonEmpty(value)) {
    return;
  }

  record[name] = value;
}

/**
 * Normalize a parsed CSV cell value into a trimmed string.
 * @param {unknown} rawValue - Value extracted from the parsed line.
 * @returns {string} Trimmed string ready for assignment.
 */
function normalizeCsvValue(rawValue) {
  if (isCsvValueMissing(rawValue)) {
    return '';
  }

  return String(rawValue).trim();
}

/**
 * Determine whether a CSV cell value is absent.
 * @param {unknown} value - Value extracted from the parsed line.
 * @returns {boolean} True when the value is `null` or `undefined`.
 */
function isCsvValueMissing(value) {
  return value === undefined || value === null;
}
