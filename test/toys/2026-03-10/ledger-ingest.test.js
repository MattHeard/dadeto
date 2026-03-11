import { describe, expect, it } from '@jest/globals';
import {
  importTransactions,
  fixtures,
  normalizationExamples,
} from '../../../src/core/ledger-ingest/core.js';

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
});
