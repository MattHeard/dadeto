import { describe, expect, it } from '@jest/globals';
import {
  applyStateTransition,
  createLedgerEvent,
  verifyLedgerBalance,
} from '../../../../src/core/cloud/billing/billing-protocol-core.js';
import { reconcileBillingIdentity } from '../../../../src/core/cloud/billing/reconciliation-core.js';

describe('billing protocol', () => {
  it('allows payment and refund progression but forbids paid expiry', () => {
    expect(
      applyStateTransition({
        kind: 'purchase',
        state: 'pending',
        nextState: 'paid',
      }).state
    ).toBe('paid');
    expect(() =>
      applyStateTransition({
        kind: 'purchase',
        state: 'paid',
        nextState: 'expired',
      })
    ).toThrow();
  });

  it('supports reserve settlement and recovery release', () => {
    expect(
      applyStateTransition({
        kind: 'operation',
        state: 'reserved',
        nextState: 'needs_recovery',
      }).state
    ).toBe('needs_recovery');
    expect(
      applyStateTransition({
        kind: 'operation',
        state: 'needs_recovery',
        nextState: 'released',
      }).state
    ).toBe('released');
  });

  it('creates validated immutable ledger events and checks conservation', () => {
    const event = createLedgerEvent({
      eventId: 'e1',
      type: 'credits_issued',
      amount: 5,
      billingIdentityId: 'key-1',
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(verifyLedgerBalance([event, { amount: -2 }], 3).valid).toBe(true);
    expect(verifyLedgerBalance([event], -1).valid).toBe(false);
  });
});

describe('billing reconciliation', () => {
  it('reports ledger, lot, and provider discrepancies without mutation', () => {
    const report = reconcileBillingIdentity({
      ledgerEvents: [{ amount: 5 }],
      lots: [{ remainingCredits: 4 }],
      aggregateBalance: 4,
      providerPayments: [{ id: 'pay-1' }],
      purchases: [],
    });
    expect(report.ok).toBe(false);
    expect(report.discrepancies.map(item => item.code)).toEqual([
      'ledger_balance_mismatch',
      'provider_payment_without_purchase',
    ]);
  });
});
