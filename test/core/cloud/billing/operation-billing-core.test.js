import { describe, expect, it, jest } from '@jest/globals';
import {
  createReservation,
  isOperationReservationConfirmed,
  isOperationResolutionComplete,
  resolveOperationOutcome,
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

  it.each([
    [{ status: 200, body: { status: 'reserved', applied: true } }, true],
    [{ status: 200, body: { status: 'reserved', applied: false } }, false],
    [{ status: 200, body: { status: 'settled', applied: true } }, false],
    [{ status: 200, body: null }, false],
  ])('recognizes only newly applied reservations', (result, expected) => {
    expect(isOperationReservationConfirmed(result)).toBe(expected);
  });

  it.each([
    [{ status: 200, body: { status: 'settled' } }, 'success', true],
    [{ status: 200, body: { duplicate: true } }, 'success', true],
    [{ status: 200, body: { status: 'reserved' } }, 'success', false],
    [{ status: 503, body: { status: 'settled' } }, 'success', false],
    [{ status: 200, body: { status: 'needs_recovery' } }, 'ambiguous', true],
    [{ status: 200, body: { duplicate: true } }, 'ambiguous', true],
    [{ status: 200, body: { status: 'settled' } }, 'ambiguous', false],
  ])('recognizes the confirmed %s outcome', (result, outcome, expected) => {
    expect(isOperationResolutionComplete(result, outcome)).toBe(expected);
  });

  it('resolves through the injected billing service', async () => {
    const resolveOperation = jest.fn().mockResolvedValue({
      status: 200,
      body: { status: 'settled' },
    });
    const allowEffects = { testOnly: true };
    const input = {
      billing: { resolveOperation },
      allowEffects,
      uuid: 'billing-1',
      operationType: 'chat',
      operationAttemptId: 'attempt-1',
      outcome: 'success',
    };

    await expect(resolveOperationOutcome(input)).resolves.toBe(true);
    expect(resolveOperation).toHaveBeenCalledWith(allowEffects, {
      uuid: 'billing-1',
      eventId: 'attempt-1:success',
      operationType: 'chat',
      operationAttemptId: 'attempt-1',
      outcome: 'success',
    });
  });

  it('returns false when the injected billing service throws', async () => {
    const input = {
      billing: {
        resolveOperation: jest.fn().mockRejectedValue(new Error('offline')),
      },
      allowEffects: {},
      uuid: 'billing-1',
      operationType: 'chat',
      operationAttemptId: 'attempt-1',
      outcome: 'ambiguous',
    };

    await expect(resolveOperationOutcome(input)).resolves.toBe(false);
  });
});
