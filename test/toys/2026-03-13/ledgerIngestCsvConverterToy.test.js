import {
  ledgerIngestCsvConverterToy,
  parseLedgerCsv,
} from '../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestCsvConverterToy.js';

describe('ledgerIngestCsvConverterToy', () => {
  const baseHeader =
    'Booking date;Value date;Transaction type;Booking text;Amount;Currency;Account IBAN;Category';

  it('returns error payload for invalid inputs', () => {
    const result = ledgerIngestCsvConverterToy('only one line', new Map());
    expect(JSON.parse(result)).toEqual({ error: 'Invalid ledger-ingest CSV input' });
  });

  it('throws for missing required header', () => {
    const csv = `${baseHeader.replace(';Category', '')}\n01.03.2026;01.03.2026;CARD;Coffee;1,00;EUR;DE01;Food`;
    expect(() => parseLedgerCsv(csv)).toThrow('Missing required CSV header: Category');
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
      `${baseHeader}\n` +
      '06.03.2026;07.03.2026;CARD;Snack;;EUR;DE22;Food\n';

    const parsed = parseLedgerCsv(csv);
    expect(parsed.rawRecords).toHaveLength(1);
    expect(parsed.rawRecords[0]).toMatchObject({
      recordId: 'DE22:1',
      bookingDate: '2026-03-06',
      valueDate: '2026-03-07',
      amount: '',
    });
  });

  it('gracefully normalizes missing columns in sparse rows', () => {
    const csv =
      `${baseHeader}\n` +
      '06.03.2026\n';

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
