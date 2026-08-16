import { describe, expect, it } from '@jest/globals';
import {
  createReservation,
  resolveReservation,
} from '../../../../src/core/cloud/billing/operation-billing-core.js';

describe('operation billing', () => {
  const reservation = createReservation({
    operationType: 'function.invoke',
    operationAttemptId: 'op-1',
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

  it.each([
    ['operationType', { operationType: '' }],
    ['operationAttemptId', { operationAttemptId: '' }],
    ['billingIdentityId', { billingIdentityId: '' }],
  ])('rejects a missing %s', (_field, override) => {
    expect(() =>
      createReservation({
        operationType: 'function.invoke',
        operationAttemptId: 'op-1',
        billingIdentityId: 'key-1',
        amount: 3,
        allocations: [],
        pricingSnapshotId: 'snap-1',
        createdAt: '2026-08-11T00:00:00.000Z',
        ...override,
      })
    ).toThrow('operation identity is required');
  });

  it.each([Number.NaN, 0, -1, 1.5])('rejects invalid amount %s', amount => {
    expect(() =>
      createReservation({
        operationType: 'function.invoke',
        operationAttemptId: 'op-1',
        billingIdentityId: 'key-1',
        amount,
        allocations: [],
        pricingSnapshotId: 'snap-1',
        createdAt: '2026-08-11T00:00:00.000Z',
      })
    ).toThrow('amount must be positive');
  });

  it('rejects an outcome that is invalid for the current state', () => {
    expect(() =>
      resolveReservation({
        reservation: { ...reservation, status: 'settled' },
        outcome: 'success',
      })
    ).toThrow('Invalid operation transition');
  });
});
