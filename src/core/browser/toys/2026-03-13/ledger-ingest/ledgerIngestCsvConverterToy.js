import {
  isBlankStringValue,
  whenOrDefault,
  whenOrNull,
} from '../../../../commonCore.js';
import { createDefaultLedgerIngestDedupePolicy } from './ledgerIngestShared.js';

/**
 * Ledger Ingest CSV Converter Toy
 * ----------------------------------------------------------
 * Converts a semicolon-delimited bank transaction CSV into a copyable JSON
 * payload that matches the ledger-ingest import input shape.
 */
const REQUIRED_HEADERS = [
  'Booking date',
  'Value date',
  'Transaction type',
  'Booking text',
  'Amount',
  'Currency',
  'Account IBAN',
  'Category',
];

const DEFAULT_FIELD_MAPPING = {
  postedDate: 'bookingDate',
  amount: 'amount',
  description: 'bookingText',
  currency: 'currency',
  recordId: 'recordId',
};

const CSV_CHARACTER_HANDLERS = [
  processCsvQuotedCharacter,
  processCsvDelimiterCharacter,
  processCsvPlainCharacter,
];

/**
 * Split the CSV into rows and columns while honoring double-quoted fields.
 * @param {string} input Semicolon-delimited CSV text.
 * @returns {string[][]} Parsed rows.
 */
function splitCsvRows(input) {
  const state = createCsvParseState();

  for (let index = 0; index < input.length; index += 1) {
    index = processCsvCharacter(state, input, index);
  }

  finalizeCsvParseState(state);

  return state.rows;
}

/**
 * @returns {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} CSV parse state.
 */
function createCsvParseState() {
  return {
    rows: [],
    row: [],
    cell: '',
    inQuotes: false,
  };
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {string} input CSV text.
 * @param {number} index Current character index.
 * @returns {number} Index that should be assigned back to the loop.
 */
function processCsvCharacter(state, input, index) {
  const char = input[index];
  const next = input[index + 1];
  const chars = { char, next };
  return CSV_CHARACTER_HANDLERS.reduce(
    (nextIndex, handler) => nextIndex ?? handler(state, chars, index),
    null
  );
}

/**
 * Run one CSV branch and fall back to the alternate branch.
 * @template T
 * @param {boolean} condition Whether the primary branch should run.
 * @param {() => T} onMatch Primary branch.
 * @param {() => T} onFallback Fallback branch.
 * @returns {T} Branch result.
 */
function whenCsvBranch(condition, onMatch, onFallback) {
  if (condition) {
    return onMatch();
  }
  return onFallback();
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {{ char: string, next: string | undefined }} chars Current and next character.
 * @param {number} index Current character index.
 * @returns {number | null} Updated index when the quoted character was handled.
 */
function processCsvQuotedCharacter(state, chars, index) {
  if (!isCsvQuoteCharacter(chars.char)) {
    return null;
  }
  return processCsvQuotedCharacterState(state, chars, index);
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {{ char: string, next: string | undefined }} chars Current and next character.
 * @param {number} index Current character index.
 * @returns {number} Updated index when the quote was handled.
 */
function processCsvQuotedCharacterState(state, chars, index) {
  return whenCsvBranch(
    !state.inQuotes,
    () => {
      toggleCsvQuoteState(state);
      return index;
    },
    () => processCsvQuotedCharacterInside(state, chars.next, index)
  );
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {string | undefined} next Next character.
 * @param {number} index Current character index.
 * @returns {number} Updated index after quote handling.
 */
function processCsvQuotedCharacterInside(state, next, index) {
  if (isCsvEscapedQuote(next)) {
    appendCsvCellChar(state, '"');
    return index + 1;
  }
  toggleCsvQuoteState(state);
  return index;
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {{ char: string, next: string | undefined }} chars Current and next character.
 * @param {number} index Current character index.
 * @returns {number | null} Updated index when a delimiter was handled.
 */
function processCsvDelimiterCharacter(state, chars, index) {
  if (shouldProcessCsvSeparator(state, chars.char)) {
    flushCsvCell(state);
    return index;
  }
  if (shouldProcessCsvLineBreak(state, chars.char)) {
    return processCsvLineBreakContinuation(state, chars, index);
  }
  return null;
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {{ char: string, next: string | undefined }} chars Current and next character.
 * @param {number} index Current character index.
 * @returns {number} Updated index after the line break is handled.
 */
function processCsvLineBreakContinuation(state, chars, index) {
  flushCsvRow(state);
  return whenOrDefault(
    shouldSkipCsvLineBreakTail(chars),
    () => index + 1,
    index
  );
}

/**
 * @param {{ char: string, next: string | undefined }} chars Current and next character.
 * @returns {boolean} True when the line break consumed a CRLF pair.
 */
function shouldSkipCsvLineBreakTail(chars) {
  return isCsvCarriageReturn(chars.char) && chars.next === '\n';
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @param {{ char: string, next: string | undefined }} chars Current and next character.
 * @param {number} index Current character index.
 * @returns {number} Updated index after appending a plain character.
 */
function processCsvPlainCharacter(state, chars, index) {
  appendCsvCellChar(state, chars.char);
  return index;
}

/**
 * @returns {boolean} True when the separator should terminate the current cell.
 * @param {{ inQuotes: boolean }} state CSV parse state.
 * @param {string} char Current character.
 */
function shouldProcessCsvSeparator(state, char) {
  return !state.inQuotes && isCsvSeparatorCharacter(char);
}

/**
 * @returns {boolean} True when the line break should terminate the current row.
 * @param {{ inQuotes: boolean }} state CSV parse state.
 * @param {string} char Current character.
 */
function shouldProcessCsvLineBreak(state, char) {
  return !state.inQuotes && isCsvLineBreakCharacter(char);
}

/**
 * @param {string} char Current character.
 * @returns {boolean} True when the character is the quote delimiter.
 */
function isCsvQuoteCharacter(char) {
  return char === '"';
}

/**
 * @param {string} char Current character.
 * @returns {boolean} True when the character is the field separator.
 */
function isCsvSeparatorCharacter(char) {
  return char === ';';
}

/**
 * @param {string} char Current character.
 * @returns {boolean} True when the character terminates a row.
 */
function isCsvLineBreakCharacter(char) {
  return char === '\n' || char === '\r';
}

/**
 * @param {string} char Current character.
 * @returns {boolean} True when the character is carriage return.
 */
function isCsvCarriageReturn(char) {
  return char === '\r';
}

/**
 * @param {string | undefined} next Next character.
 * @returns {boolean} True when the quote is escaped by a second quote.
 */
function isCsvEscapedQuote(next) {
  return next === '"';
}

/**
 * @param {{ rows: string[][], row: string[], cell: string, inQuotes: boolean }} state CSV parse state.
 * @returns {void}
 */
function finalizeCsvParseState(state) {
  if (!hasPendingCsvParseData(state)) {
    return;
  }
  flushCsvRow(state);
}

/**
 * @param {{ row: string[], cell: string }} state CSV parse state.
 * @returns {boolean} True when the state still contains a pending cell or row.
 */
function hasPendingCsvParseData(state) {
  return state.cell.length > 0 || state.row.length > 0;
}

/**
 * @param {{ row: string[], cell: string }} state CSV parse state.
 * @returns {void}
 */
function flushCsvCell(state) {
  state.row.push(state.cell);
  state.cell = '';
}

/**
 * @param {{ rows: string[][], row: string[], cell: string }} state CSV parse state.
 * @returns {void}
 */
function flushCsvRow(state) {
  flushCsvCell(state);
  state.rows.push(state.row);
  state.row = [];
}

/**
 * @param {{ inQuotes: boolean }} state CSV parse state.
 * @returns {void}
 */
function toggleCsvQuoteState(state) {
  state.inQuotes = !state.inQuotes;
}

/**
 * @param {{ cell: string }} state CSV parse state.
 * @param {string} char Character to append.
 * @returns {void}
 */
function appendCsvCellChar(state, char) {
  state.cell += char;
}

/**
 * Build a header lookup table for quick column access.
 * @param {string[]} header Row 0 split into columns.
 * @returns {Map<string, number>} Header lookup by exact schema label.
 */
function buildHeaderLookup(header) {
  const lookup = new Map();
  header.forEach((column, index) => {
    lookup.set(column.trim(), index);
  });
  return lookup;
}

/**
 * Convert a dd.mm.yyyy date string into ISO yyyy-mm-dd for the core.
 * @param {string|undefined} value Date string from the CSV.
 * @returns {string} ISO date or empty string.
 */
function normalizeCsvDate(value) {
  const match = parseCsvDateMatch(value);
  if (!match) {
    return '';
  }

  return formatCsvDateMatch(match);
}

/**
 * @param {string|undefined} value Date string from the CSV.
 * @returns {string[] | null} Matching date parts or null.
 */
function parseCsvDateMatch(value) {
  return String(value ?? '')
    .trim()
    .match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
}

/**
 * @param {string[]} match Parsed dd.mm.yyyy components.
 * @returns {string} ISO date or empty string.
 */
function formatCsvDateMatch(match) {
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Convert a localized CSV amount into a canonical numeric string.
 * @param {string|undefined} value Raw CSV amount.
 * @returns {string} Dot-decimal amount string or empty string.
 */
function normalizeCsvAmount(value) {
  const candidate = normalizeCsvAmountCandidate(value);
  return formatCsvAmountCandidate(parseCsvAmountCandidate(candidate));
}

/**
 * @param {string|undefined} value Raw CSV amount.
 * @returns {string} Trimmed candidate amount string.
 */
function normalizeCsvAmountCandidate(value) {
  return normalizeCsvTextCandidate(value);
}

/**
 * @param {string} candidate Candidate amount string.
 * @returns {number | null} Parsed numeric amount or null when invalid.
 */
function parseCsvAmount(candidate) {
  const cleaned = candidate
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * @param {string} candidate Candidate amount string.
 * @returns {number | null} Parsed numeric amount or null when invalid or empty.
 */
function parseCsvAmountCandidate(candidate) {
  return whenOrNull(candidate.length !== 0, () => parseCsvAmount(candidate));
}

/**
 * @param {number | null} parsed Parsed amount candidate.
 * @returns {string} Normalized amount string or empty string.
 */
function formatCsvAmountCandidate(parsed) {
  if (parsed === null) {
    return '';
  }

  return `${parsed}`;
}

/**
 * Build a stable row id for adapter traceability.
 * @param {string} accountIban Source account identifier.
 * @param {number} rowNumber Row index in the CSV payload, 1-based for data rows.
 * @returns {string} Stable adapter id.
 */
function buildCsvRecordId(accountIban, rowNumber) {
  return `${getCsvRecordPrefix(accountIban)}:${rowNumber}`;
}

/**
 * @param {string} accountIban Source account identifier.
 * @returns {string} Stable record prefix.
 */
function getCsvRecordPrefix(accountIban) {
  return normalizeCsvRecordPrefixCandidate(accountIban) || 'ledger-ingest';
}

/**
 * @param {string} accountIban Source account identifier.
 * @returns {string} Trimmed record prefix candidate.
 */
function normalizeCsvRecordPrefixCandidate(accountIban) {
  return normalizeCsvTextCandidate(accountIban);
}

/**
 * Normalize a CSV text candidate into a trimmed string.
 * @param {unknown} value Candidate value.
 * @returns {string} Trimmed string candidate.
 */
function normalizeCsvTextCandidate(value) {
  return String(value ?? '').trim();
}

/**
 * Convert the ledger-ingest CSV schema into raw JSON records.
 * @param {string} input Semicolon-delimited CSV text.
 * @returns {{ source: string, fieldMapping: Record<string, string>, dedupePolicy: Record<string, unknown>, rawRecords: Record<string, unknown>[] }} Adapter payload.
 */
function parseLedgerCsv(input) {
  const rows = splitCsvRows(input);
  ensureLedgerCsvRows(rows);

  const headerLookup = buildHeaderLookup(rows[0]);
  ensureLedgerCsvHeaders(headerLookup);

  return {
    source: 'ledger-ingest-csv',
    fieldMapping: { ...DEFAULT_FIELD_MAPPING },
    dedupePolicy: createDefaultLedgerIngestDedupePolicy(),
    rawRecords: collectLedgerCsvRecords(rows, headerLookup),
  };
}

/**
 * @param {string[][]} rows Parsed CSV rows.
 * @returns {void}
 */
function ensureLedgerCsvRows(rows) {
  if (rows.length < 2) {
    throw new Error('Invalid ledger-ingest CSV input');
  }
}

/**
 * @param {Map<string, number>} headerLookup Header lookup by exact schema label.
 * @returns {void}
 */
function ensureLedgerCsvHeaders(headerLookup) {
  const missingHeader = findMissingLedgerCsvHeader(headerLookup);
  if (missingHeader) {
    throw new Error(`Missing required CSV header: ${missingHeader}`);
  }
}

/**
 * @param {Map<string, number>} headerLookup Header lookup by exact schema label.
 * @returns {string | undefined} The first missing required header, if any.
 */
function findMissingLedgerCsvHeader(headerLookup) {
  return REQUIRED_HEADERS.find(headerName => !headerLookup.has(headerName));
}

/**
 * @param {string[]} row CSV row under review.
 * @returns {boolean} True when the row is empty.
 */
function isBlankLedgerCsvRow(row) {
  return row.length === 1 && isBlankStringValue(row[0]);
}

/**
 * @param {string[][]} rows Parsed CSV rows.
 * @param {Map<string, number>} headerLookup Header lookup by exact schema label.
 * @returns {Record<string, unknown>[]} Raw records converted from CSV.
 */
function collectLedgerCsvRecords(rows, headerLookup) {
  const rawRecords = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    appendLedgerCsvRecord(rawRecords, rows[rowIndex], {
      headerLookup,
      rowIndex,
    });
  }

  return rawRecords;
}

/**
 * @param {Record<string, unknown>[]} rawRecords Raw records accumulator.
 * @param {string[]} row CSV row under review.
 * @param {{ headerLookup: Map<string, number>, rowIndex: number }} context Record assembly context.
 * @returns {void}
 */
function appendLedgerCsvRecord(rawRecords, row, context) {
  if (isBlankLedgerCsvRow(row)) {
    return;
  }
  rawRecords.push(
    buildLedgerCsvRecord(row, context.headerLookup, context.rowIndex)
  );
}

/**
 * @param {string[]} row CSV row under review.
 * @param {Map<string, number>} headerLookup Header lookup by exact schema label.
 * @param {number} index Row index in the CSV payload.
 * @returns {Record<string, unknown>} Raw record converted from CSV.
 */
function buildLedgerCsvRecord(row, headerLookup, index) {
  const bookingDate = row[headerLookup.get('Booking date')];
  const valueDate = row[headerLookup.get('Value date')];
  const transactionType = row[headerLookup.get('Transaction type')];
  const bookingText = row[headerLookup.get('Booking text')];
  const amount = row[headerLookup.get('Amount')];
  const currency = row[headerLookup.get('Currency')];
  const accountIban = row[headerLookup.get('Account IBAN')];
  const category = row[headerLookup.get('Category')];

  return {
    recordId: buildCsvRecordId(accountIban, index),
    bookingDate: normalizeCsvDate(bookingDate),
    valueDate: normalizeCsvDate(valueDate),
    transactionType: String(transactionType).trim(),
    bookingText: String(bookingText).trim(),
    amount: normalizeCsvAmount(amount),
    currency: String(currency).trim(),
    accountIban: String(accountIban).trim(),
    category: String(category).trim(),
  };
}

/**
 * Convert a semicolon-delimited CSV string into the JSON payload that the main
 * ledger-ingest toy accepts.
 * @param {string} input CSV text pasted into the converter toy.
 * @returns {string} Pretty-printed JSON payload or an error object.
 */
export function ledgerIngestCsvConverterToy(input) {
  try {
    return JSON.stringify(parseLedgerCsv(input), null, 2);
  } catch {
    return JSON.stringify(
      { error: 'Invalid ledger-ingest CSV input' },
      null,
      2
    );
  }
}

export { parseLedgerCsv };
