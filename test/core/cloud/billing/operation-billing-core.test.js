import { describe, expect, it } from '@jest/globals';
import {
  createReservation,
  resolveReservation,
} from '../../../../src/core/cloud/billing/operation-billing-core.js';

describe('operation billing', () => {
  const reservation = createReservation({
    operationId: 'op-1',
    billingIdentityId: 'key-1',
    amount: 3,
    allocations: [{ purchaseId: 'p-1', amount: 3 }],
    pricingSnapshotId: 'snap-1',
    createdAt: '2026-08-11T00:00:00.000Z',
  });

  it('settles success and releases confirmed failure', () => {
    expect(resolveReservation({ reservation, outcome: 'success' }).status).toBe(
      'settled'
    );
    expect(resolveReservation({ reservation, outcome: 'failure' }).status).toBe(
      'released'
    );
  });

  it('retains ambiguous outcomes for recovery', () => {
    const unresolved = resolveReservation({
      reservation,
      outcome: 'ambiguous',
    });
    expect(unresolved.status).toBe('needs_recovery');
    expect(
      resolveReservation({ reservation: unresolved, outcome: 'failure' }).status
    ).toBe('released');
  });
});
