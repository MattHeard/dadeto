import { describe, expect, test } from '@jest/globals';
import { ledgerBalance } from '../../../src/core/browser/toys/2026-07-30/ledgerBalance.js';

describe('ledgerBalance', () => {
  test('returns the sum of signed transaction amounts', () => {
    expect(
      ledgerBalance([
        { amount: 100 },
        { amount: -25.5 },
        { amount: 10 },
      ])
    ).toBe(84.5);
  });

  test('returns zero for an empty ledger', () => {
    expect(ledgerBalance([])).toBe(0);
  });
});
