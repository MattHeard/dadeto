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

const DEFAULT_DEDUPE_POLICY = {
  name: 'posted-date-amount-description',
  strategy: 'first-wins',
  candidateFields: ['postedDate', 'amount', 'description'],
  caseInsensitive: true,
};

const DEFAULT_FIELD_MAPPING = {
  postedDate: 'bookingDate',
  amount: 'amount',
  description: 'bookingText',
  currency: 'currency',
  recordId: 'recordId',
};

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
 * @returns {RegExpMatchArray | null} Matching date parts or null.
 */
function parseCsvDateMatch(value) {
  return String(value ?? '')
    .trim()
    .match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
}

/**
 * @param {RegExpMatchArray} match Parsed dd.mm.yyyy components.
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
  if (candidate.length === 0) {
    return '';
  }

  const parsed = parseCsvAmount(candidate);
  if (parsed === null) {
    return '';
  }

  return `${parsed}`;
}

/**
 * @param {string|undefined} value Raw CSV amount.
 * @returns {string} Trimmed candidate amount string.
 */
function normalizeCsvAmountCandidate(value) {
  return String(value ?? '').trim();
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
  const candidate = String(accountIban ?? '').trim();
  return candidate || 'ledger-ingest';
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

  const rawRecords = [];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (isBlankLedgerCsvRow(row)) {
      continue;
    }

    rawRecords.push(buildLedgerCsvRecord(row, headerLookup, index));
  }

  return {
    source: 'ledger-ingest-csv',
    fieldMapping: { ...DEFAULT_FIELD_MAPPING },
    dedupePolicy: { ...DEFAULT_DEDUPE_POLICY },
    rawRecords,
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
  for (const headerName of REQUIRED_HEADERS) {
    if (!headerLookup.has(headerName)) {
      throw new Error(`Missing required CSV header: ${headerName}`);
    }
  }
}

/**
 * @param {string[]} row CSV row under review.
 * @returns {boolean} True when the row is empty.
 */
function isBlankLedgerCsvRow(row) {
  return row.length === 1 && row[0].trim().length === 0;
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
