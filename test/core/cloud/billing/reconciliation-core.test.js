import { reconcileBillingIdentity } from '../../../../src/core/cloud/billing/reconciliation-core.js';

describe('reconcileBillingIdentity', () => {
  test('accepts a consistent identity with matched provider payments', () => {
    expect(
      reconcileBillingIdentity({
        aggregateBalance: 3,
        ledgerEvents: [{ amount: 3 }],
        lots: [{ remainingCredits: 3 }],
        providerPayments: [{ id: 'payment-1' }],
        purchases: [{ paymentId: 'payment-1' }],
      })
    ).toEqual({ discrepancies: [], ok: true });
  });

  test('reports ledger and lot balance mismatches', () => {
    const result = reconcileBillingIdentity({
      aggregateBalance: 3,
      ledgerEvents: [{ amount: 2 }],
      lots: [{ remainingCredits: 1 }],
    });

    expect(result.ok).toBe(false);
    expect(result.discrepancies.map(discrepancy => discrepancy.code)).toEqual([
      'ledger_balance_mismatch',
      'lot_balance_mismatch',
    ]);
  });

  test('reports provider payments without matching purchases', () => {
    expect(
      reconcileBillingIdentity({
        providerPayments: [{ id: 'missing' }],
        purchases: [{}, { paymentId: 'known' }],
      })
    ).toMatchObject({
      ok: false,
      discrepancies: [
        {
          code: 'provider_payment_without_purchase',
          details: { paymentId: 'missing' },
        },
      ],
    });
  });

  test('defaults absent collections and balance to a consistent empty identity', () => {
    expect(reconcileBillingIdentity({ lots: [{}] })).toEqual({
      discrepancies: [],
      ok: true,
    });
  });
});
