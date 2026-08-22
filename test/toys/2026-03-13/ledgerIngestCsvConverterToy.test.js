import {
  ledgerIngestCsvConverterToy,
  parseLedgerCsv,
  ledgerIngestCsvConverterToyTestOnly,
} from '../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestCsvConverterToy.js';

describe('ledgerIngestCsvConverterToy', () => {
  const baseHeader =
    'Booking date;Value date;Transaction type;Booking text;Amount;Currency;Account IBAN;Category';

  it('normalizes date, amount, and text helper boundaries directly', () => {
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvLineBreakCharacter('\n')).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvLineBreakCharacter('\r')).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvLineBreakCharacter('x')).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvCarriageReturn('\r')).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvCarriageReturn('\n')).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.shouldSkipCsvLineBreakTail({ char: '\r', next: '\n' })).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.shouldSkipCsvLineBreakTail({ char: '\n', next: '\n' })).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.shouldSkipCsvLineBreakTail({ char: '\r', next: 'x' })).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.shouldSkipCsvLineBreakTail({ char: 'x', next: '\n' })).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvEscapedQuote('"')).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.isCsvEscapedQuote('x')).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.hasPendingCsvParseData({ cell: '', row: [] })).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.hasPendingCsvParseData({ cell: 'x', row: [] })).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.isBlankLedgerCsvRow([''])).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.isBlankLedgerCsvRow(['x'])).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.isBlankLedgerCsvRow(['', ''])).toBe(false);
    expect(ledgerIngestCsvConverterToyTestOnly.isBlankLedgerCsvRow(['  '])).toBe(true);
    expect(ledgerIngestCsvConverterToyTestOnly.buildHeaderLookup([' Amount ']).get('Amount')).toBe(0);
    const pending = { rows: [], row: ['x'], cell: '', inQuotes: false };
    ledgerIngestCsvConverterToyTestOnly.finalizeCsvParseState(pending);
    expect(pending.rows).toEqual([['x', '']]);
    const empty = { rows: [], row: [], cell: '', inQuotes: false };
    ledgerIngestCsvConverterToyTestOnly.finalizeCsvParseState(empty);
    expect(empty.rows).toEqual([]);
    expect(() => ledgerIngestCsvConverterToyTestOnly.ensureLedgerCsvRows([])).toThrow('Invalid ledger-ingest CSV input');
    expect(ledgerIngestCsvConverterToyTestOnly.ensureLedgerCsvRows([['header'], ['row']])).toBeUndefined();
    const header = ledgerIngestCsvConverterToyTestOnly.buildHeaderLookup([
      'Booking date', 'Value date', 'Transaction type', 'Booking text',
      'Amount', 'Currency', 'Account IBAN', 'Category',
    ]);
    expect(ledgerIngestCsvConverterToyTestOnly.buildLedgerCsvRecord(
      ['01.03.2026', '02.03.2026', 'CARD', ' Coffee ', '1,50', 'EUR', 'DE1', 'Food'],
      header,
      4
    )).toEqual({
      recordId: 'DE1:4', bookingDate: '2026-03-01', valueDate: '2026-03-02',
      transactionType: 'CARD', bookingText: 'Coffee', amount: '1.5',
      currency: 'EUR', accountIban: 'DE1', category: 'Food',
    });
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvDate('31.12.2025')).toBe('2025-12-31');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvDate('2025-12-31')).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvDate(null)).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvDate('1.12.2025')).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvDate('31.12.2025x')).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvDate('x31.12.2025')).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.parseCsvDateMatch(null)).toBeNull();
    expect(ledgerIngestCsvConverterToyTestOnly.parseCsvDateMatch(' 31.12.2025 ')).not.toBeNull();
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvAmount('1.234,50 EUR')).toBe('1234.5');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvAmount('1.234')).toBe('1234');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvAmount('not-a-number')).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvAmount(null)).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.parseCsvAmount('1.234')).toBe(1234);
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvTextCandidate('  hello  ')).toBe('hello');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvTextCandidate(null)).toBe('');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvMappedField(undefined)).toBe('undefined');
    expect(ledgerIngestCsvConverterToyTestOnly.normalizeCsvMappedField('  x  ')).toBe('x');
  });

  it('returns error payload for invalid inputs', () => {
    const result = ledgerIngestCsvConverterToy('only one line', new Map());
    expect(JSON.parse(result)).toEqual({
      error: 'Invalid ledger-ingest CSV input',
    });
  });

  it('throws for missing required header', () => {
    const csv = `${baseHeader.replace(';Category', '')}\n01.03.2026;01.03.2026;CARD;Coffee;1,00;EUR;DE01;Food`;
    expect(() => parseLedgerCsv(csv)).toThrow(
      'Missing required CSV header: Category'
    );
  });

  it('parses rows, normalizes values, skips blank rows, and handles CRLF/quotes', () => {
    const csv = [
      baseHeader,
      '01.03.2026;02.03.2026;CARD;"Coffee";1.234,56;EUR;DE99 123;Food',
      '',
      'bad date;03.03.2026;TRANSFER;"Quoted; Text";not-a-number;EUR;"";Misc',
      '04.03.2026;05.03.2026;CARD;"Escaped ""quote""";2,50 EUR;EUR;DE11;Fun',
    ].join('\r\n');

    const parsed = parseLedgerCsv(csv);
    expect(parsed.source).toBe('ledger-ingest-csv');
    expect(parsed.fieldMapping).toEqual({
      postedDate: 'bookingDate', amount: 'amount', description: 'bookingText',
      currency: 'currency', recordId: 'recordId',
    });
    expect(parsed.dedupePolicy).toBeDefined();
    expect(parsed.rawRecords).toHaveLength(3);

    expect(parsed.rawRecords[0]).toMatchObject({
      recordId: 'DE99 123:1',
      bookingDate: '2026-03-01',
      valueDate: '2026-03-02',
      transactionType: 'CARD',
      bookingText: 'Coffee',
      amount: '1234.56',
      currency: 'EUR',
      accountIban: 'DE99 123',
      category: 'Food',
    });

    expect(parsed.rawRecords[1]).toMatchObject({
      recordId: 'ledger-ingest:3',
      bookingDate: '',
      valueDate: '2026-03-03',
      amount: '',
      bookingText: 'Quoted; Text',
    });

    expect(parsed.rawRecords[2]).toMatchObject({
      recordId: 'DE11:4',
      bookingText: 'Escaped "quote"',
      amount: '2.5',
    });

    const result = ledgerIngestCsvConverterToy(csv, new Map());
    const payload = JSON.parse(result);
    expect(payload.rawRecords).toHaveLength(3);
  });

  it('handles LF-only rows, trailing newline, and empty amount values', () => {
    const csv =
      `${baseHeader}\n` + '06.03.2026;07.03.2026;CARD;Snack;;EUR;DE22;Food\n';

    const parsed = parseLedgerCsv(csv);
    expect(parsed.rawRecords).toHaveLength(1);
    expect(parsed.rawRecords[0]).toMatchObject({
      recordId: 'DE22:1',
      bookingDate: '2026-03-06',
      valueDate: '2026-03-07',
      amount: '',
    });
  });

  it('covers the CSV branch fallback helper', () => {
    const state = {
      mode: 'plain',
      row: [],
      fieldIndex: 0,
      currentCell: '',
    };

    expect(
      ledgerIngestCsvConverterToyTestOnly.processCsvCharacterWithHandlers(
        state,
        'x',
        0,
        []
      )
    ).toBe(0);
  });

  it('covers the missing-header fallback helper', () => {
    const row = ['2026-03-06', '2026-03-07'];
    const headerLookup = new Map([['Booking date', 0]]);

    expect(
      ledgerIngestCsvConverterToyTestOnly.getLedgerCsvCell(
        row,
        headerLookup,
        'Value date'
      )
    ).toBe('');
    expect(
      ledgerIngestCsvConverterToyTestOnly.getLedgerCsvCell(
        row,
        headerLookup,
        'Booking date'
      )
    ).toBe('2026-03-06');
  });

  it('gracefully normalizes missing columns in sparse rows', () => {
    const csv = `${baseHeader}\n` + '06.03.2026\n';

    const parsed = parseLedgerCsv(csv);
    expect(parsed.rawRecords).toHaveLength(1);
    expect(parsed.rawRecords[0]).toMatchObject({
      bookingDate: '2026-03-06',
      valueDate: '',
      transactionType: 'undefined',
      amount: '',
      accountIban: 'undefined',
      recordId: 'ledger-ingest:1',
    });
  });
});
