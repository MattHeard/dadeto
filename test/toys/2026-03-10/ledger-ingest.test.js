import { describe, expect, it } from '@jest/globals';
import {
  importTransactions,
  fixtures,
  normalizationExamples,
} from '../../../src/core/browser/toys/2026-03-13/ledger-ingest/core.js';
import { ledgerIngestCsvConverterToy } from '../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestCsvConverterToy.js';
import { ledgerIngestToy } from '../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js';

describe('importTransactions', () => {
  it('normalizes mapped rows, records normalization steps, and exposes summaries', () => {
    const { input } = fixtures.happyPath;
    const result = importTransactions(input);

    expect(result.source).toBe(input.source);
    expect(result.summary.canonicalTransactions).toBe(2);
    expect(result.summary.duplicatesDetected).toBe(0);
    expect(result.summary.dedupeFields).toEqual([
      'postedDate',
      'amount',
      'description',
    ]);
    expect(result.summary.normalizationSteps).toBe(normalizationExamples);

    expect(result.canonicalTransactions[0]).toMatchObject({
      postedDate: '2026-03-01',
      amount: -45.5,
      currency: 'USD',
      description: 'coffee shop - seattle',
      sourceRecordId: 'HV-001',
    });
    expect(result.canonicalTransactions[1]).toMatchObject({
      postedDate: '2026-03-02',
      amount: 200,
      currency: 'USD',
      description: 'payroll deposit',
      sourceRecordId: 'HV-002',
    });
    expect(
      result.canonicalTransactions.every(tx => Boolean(tx.metadata.rawRecord))
    ).toBe(true);
    expectCanonicalTransactionShape(result.canonicalTransactions[0]);
  });

  it('reports duplicates when normalized keys collide', () => {
    const { input } = fixtures.duplicateDetection;
    const result = importTransactions(input);

    expect(result.canonicalTransactions).toHaveLength(2);
    expect(result.summary.duplicatesDetected).toBe(1);
    expect(result.duplicateReports).toHaveLength(1);

    const report = result.duplicateReports[0];
    expect(report.duplicate.sourceRecordId).toBe('dup-002');
    expect(report.existing.transactionId).toBe(
      result.canonicalTransactions[0].transactionId
    );
    expect(report.policyName).toBe('posted-date-amount-description');
  });

  it('counts a repeat import row as duplicate instead of another canonical entry', () => {
    const { input } = fixtures.repeatImport;
    const result = importTransactions(input);

    expect(result.summary.rawRecords).toBe(2);
    expect(result.summary.canonicalTransactions).toBe(1);
    expect(result.summary.duplicatesDetected).toBe(1);
    expect(result.canonicalTransactions).toHaveLength(1);
    expect(result.canonicalTransactions[0].sourceRecordId).toBe('repeat-001');
    expect(result.duplicateReports).toHaveLength(1);

    const report = result.duplicateReports[0];
    expect(report.duplicate.sourceRecordId).toBe('repeat-002');
    expect(report.existing.sourceRecordId).toBe('repeat-001');
  });

  it('records structured errors when required fields are missing', () => {
    const { input } = fixtures.invalidRow;
    const result = importTransactions(input);

    expect(result.summary.rawRecords).toBe(2);
    expect(result.summary.canonicalTransactions).toBe(1);
    expect(result.summary.errorsDetected).toBe(1);
    expect(result.summary.duplicatesDetected).toBe(0);
    expect(result.duplicateReports).toHaveLength(0);
    expect(result.canonicalTransactions).toHaveLength(1);
    expect(result.errorReports).toHaveLength(1);

    const [errorReport] = result.errorReports;
    expect(errorReport).toMatchObject({
      index: 1,
      missingFields: ['postedDate', 'amount'],
      reason: 'missing-required-fields',
    });
    expect(errorReport.rawRecord.id).toBe('invalid-001');
  });

  it('wraps the core in a runnable toy response with fixture selection', () => {
    const result = JSON.parse(
      ledgerIngestToy('{"fixture":"duplicateDetection"}')
    );

    expect(result.inputMode).toBe('fixture');
    expect(result.fixture).toBe('duplicateDetection');
    expect(result.canonicalTransactions).toHaveLength(2);
    expect(result.duplicateReports).toHaveLength(1);
    expect(result.errorReports).toHaveLength(0);
    expect(result.summary.canonicalTransactions).toBe(2);
    expect(result.summary.duplicatesDetected).toBe(1);
  });

  it('falls back to the default fixture for invalid payloads', () => {
    const result = JSON.parse(ledgerIngestToy('not-json'));

    expect(result.inputMode).toBe('fixture');
    expect(result.fixture).toBe('happyPath');
    expect(result.canonicalTransactions).toHaveLength(2);
    expect(result.summary.canonicalTransactions).toBe(2);
  });

  it('accepts pasted import JSON emitted by the csv converter toy', () => {
    const csv = [
      'Booking date;Value date;Transaction type;Booking text;Amount;Currency;Account IBAN;Category',
      '30.03.2026;30.03.2026;Debit;Coffee Shop Seattle;-12,50;EUR;DE00123456789012345678;Living Expenses',
      '30.03.2026;30.03.2026;Debit;Coffee Shop Seattle;-12,50;EUR;DE00123456789012345678;Living Expenses',
      '30.03.2026;30.03.2026;Debit;Missing amount;;EUR;DE00123456789012345678;Living Expenses',
    ].join('\n');

    const converterResult = JSON.parse(ledgerIngestCsvConverterToy(csv));
    const result = JSON.parse(ledgerIngestToy(JSON.stringify(converterResult)));

    expect(converterResult).toMatchObject({
      source: 'ledger-ingest-csv',
      fieldMapping: {
        postedDate: 'bookingDate',
        amount: 'amount',
        description: 'bookingText',
        currency: 'currency',
        recordId: 'recordId',
      },
      dedupePolicy: {
        name: 'posted-date-amount-description',
        strategy: 'first-wins',
        candidateFields: ['postedDate', 'amount', 'description'],
        caseInsensitive: true,
      },
    });
    expect(converterResult.rawRecords).toHaveLength(3);
    expect(converterResult.rawRecords[0]).toMatchObject({
      recordId: 'DE00123456789012345678:1',
      bookingDate: '2026-03-30',
      valueDate: '2026-03-30',
      transactionType: 'Debit',
      bookingText: 'Coffee Shop Seattle',
      amount: '-12.5',
      currency: 'EUR',
      accountIban: 'DE00123456789012345678',
      category: 'Living Expenses',
    });

    expect(result.inputMode).toBe('json');
    expect(result.fixture).toBe('jsonImport');
    expect(result.canonicalTransactions).toHaveLength(1);
    expect(result.duplicateReports).toHaveLength(1);
    expect(result.errorReports).toHaveLength(1);
    expect(result.summary.rawRecords).toBe(3);
    expect(result.summary.canonicalTransactions).toBe(1);
    expect(result.summary.duplicatesDetected).toBe(1);
    expect(result.summary.errorsDetected).toBe(1);
    expect(result.canonicalTransactions[0]).toMatchObject({
      postedDate: '2026-03-30',
      amount: -12.5,
      currency: 'EUR',
      description: 'coffee shop seattle',
      sourceRecordId: 'DE00123456789012345678:1',
    });
    expect(result.canonicalTransactions[0].metadata.rawRecord).toMatchObject({
      recordId: 'DE00123456789012345678:1',
      bookingDate: '2026-03-30',
      valueDate: '2026-03-30',
      transactionType: 'Debit',
      bookingText: 'Coffee Shop Seattle',
      amount: '-12.5',
      currency: 'EUR',
      accountIban: 'DE00123456789012345678',
      category: 'Living Expenses',
    });
  });
});

/**
 *
 * @param transaction
 */
function expectCanonicalTransactionShape(transaction) {
  expect(Object.keys(transaction).sort()).toEqual(
    [
      'amount',
      'dedupeKey',
      'description',
      'metadata',
      'postedDate',
      'rawIndex',
      'source',
      'sourceRecordId',
      'transactionId',
      'currency',
    ].sort()
  );
  expect(Object.keys(transaction.metadata)).toEqual(['rawRecord']);
}
