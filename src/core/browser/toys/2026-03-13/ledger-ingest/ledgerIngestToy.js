import { parseJsonOrFallback } from '../../browserToysCore.js';
import { fixtures, importTransactions } from './core.js';

const DEFAULT_FIXTURE = 'happyPath';

/**
 * Resolve which fixture to run based on the parsed input.
 * @param {Record<string, unknown>} parsed Toy payload parsed from JSON.
 * @returns {string} Key for an existing fixture.
 */
function resolveFixture(parsed) {
  const candidate = parsed?.fixture;
  if (
    typeof candidate === 'string' &&
    Object.prototype.hasOwnProperty.call(fixtures, candidate)
  ) {
    return candidate;
  }
  return DEFAULT_FIXTURE;
}

/**
 * Determine whether the input should be treated as CSV.
 * @param {string} input Raw toy payload.
 * @returns {boolean} True when the payload looks like CSV text.
 */
function looksLikeCsv(input) {
  const trimmed = input.trim();
  return trimmed.length > 0 && trimmed.includes(';') && !trimmed.startsWith('{');
}

/**
 * Parse the ledger-ingest CSV schema into raw JSON records.
 * @param {string} input Semicolon-delimited CSV text.
 * @returns {{ source: string, rawRecords: Record<string, unknown>[] }} Adapter payload.
 */
function parseLedgerCsv(input) {
  const rows = splitCsvRows(input);
  if (rows.length === 0) {
    return { source: 'ledger-ingest-csv', rawRecords: [] };
  }

  const header = rows[0];
  const headerLookup = buildHeaderLookup(header);
  const rawRecords = [];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.length === 1 && row[0].trim().length === 0) {
      continue;
    }

    const bookingDate = row[headerLookup.get('Booking date') ?? -1];
    const valueDate = row[headerLookup.get('Value date') ?? -1];
    const amount = row[headerLookup.get('Amount') ?? -1];
    const currency = row[headerLookup.get('Currency') ?? -1];
    const bookingText = row[headerLookup.get('Booking text') ?? -1];
    const accountIban = row[headerLookup.get('Account IBAN') ?? -1];

    const record = {
      date: normalizeCsvDate(bookingDate),
      id: buildCsvRecordId(accountIban, index),
      amount: normalizeCsvAmount(amount),
      description: bookingText,
      currency,
      rawBookingDate: bookingDate,
      rawValueDate: valueDate,
      rawTransactionType: row[headerLookup.get('Transaction type') ?? -1],
      rawBookingText: bookingText,
      rawAmount: amount,
      rawCurrency: currency,
      rawAccountIban: accountIban,
      rawCategory: row[headerLookup.get('Category') ?? -1],
      bookingDate,
      valueDate,
      transactionType: row[headerLookup.get('Transaction type') ?? -1],
      bookingText,
      accountIban,
      category: row[headerLookup.get('Category') ?? -1],
    };
    rawRecords.push(record);
  }

  return { source: 'ledger-ingest-csv', rawRecords };
}

/**
 * Build a stable row id for adapter traceability.
 * @param {string} accountIban Source account identifier.
 * @param {number} index Row index in the CSV payload.
 * @returns {string} Stable adapter id.
 */
function buildCsvRecordId(accountIban, index) {
  const candidate = String(accountIban ?? '').trim();
  return `${candidate || 'ledger-ingest'}:${index}`;
}

/**
 * Convert a dd.mm.yyyy date string into ISO yyyy-mm-dd for the core.
 * @param {string|undefined} value Date string from the CSV.
 * @returns {string} ISO date or empty string.
 */
function normalizeCsvDate(value) {
  const candidate = String(value ?? '').trim();
  const match = candidate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return '';
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Convert a localized CSV amount into a canonical numeric string.
 * @param {string|undefined} value Raw CSV amount.
 * @returns {string} Dot-decimal amount string or empty string.
 */
function normalizeCsvAmount(value) {
  const candidate = String(value ?? '').trim();
  if (candidate.length === 0) {
    return '';
  }

  const cleaned = candidate
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return '';
  }
  return `${parsed}`;
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
 * Split the CSV into rows and columns while honoring double-quoted fields.
 * @param {string} input Semicolon-delimited CSV text.
 * @returns {string[][]} Parsed rows.
 */
function splitCsvRows(input) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ';') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/**
 * Recognize the schema and parse it into adapter records when possible.
 * @param {string} input Raw toy payload.
 * @returns {{ source?: string, rawRecords?: Record<string, unknown>[] }|null} CSV adapter payload.
 */
function parseCsvInput(input) {
  if (!looksLikeCsv(input)) {
    return null;
  }

  const parsed = parseLedgerCsv(input);
  if (parsed.rawRecords.length === 0) {
    return null;
  }

  return parsed;
}

/**
 * Create the user-facing payload that keeps canonical rows, duplicates, errors, and summary data.
 * @param {string} fixtureName Expedition fixture key.
 * @param {ReturnType<typeof importTransactions>} result Core run output.
 * @returns {Record<string, unknown>} Minimal toy response.
 */
function buildResponsePayload(fixtureName, result) {
  return {
    fixture: fixtureName,
    canonicalTransactions: result.canonicalTransactions,
    duplicateReports: result.duplicateReports,
    errorReports: result.errorReports,
    summary: result.summary,
    policy: result.policy,
  };
}

/**
 * Ledger ingest toy that runs a selected fixture and exposes canonical rows, duplicates, and errors.
 * @param {string} input Toy runner payload (JSON string).
 * @param {Map<string, unknown>} env Toy environment helpers (unused).
 * @returns {string} JSON string containing the fixture name and key result buckets.
 */
export function ledgerIngestToy(input, env) {
  void env;

  const csvPayload = parseCsvInput(input);
  if (csvPayload) {
    const result = importTransactions(csvPayload);
    return JSON.stringify({
      fixture: 'csvAdapter',
      ...buildResponsePayload('csvAdapter', result),
    });
  }

  const parsed = parseJsonOrFallback(input, {});
  const fixtureName = resolveFixture(parsed);
  const fixture = fixtures[fixtureName];
  const result = importTransactions(fixture.input);
  return JSON.stringify(buildResponsePayload(fixtureName, result));
}
