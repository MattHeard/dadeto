import { applyStateTransition } from './billing-protocol-core.js';

/**
 * Create a new operation reservation.
 * @param {{ operationId: string, billingIdentityId: string, amount: number, allocations: Array<object>, pricingSnapshotId: string, createdAt: string|Date }} input Reservation input.
 * @returns {object} Reservation.
 */
export function createReservation(input) {
  if (!input.operationId || !input.billingIdentityId)
    throw new TypeError('operation identity is required');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    throw new TypeError('amount must be positive');
  return Object.freeze({ ...input, status: 'reserved' });
}

/**
 * Apply an idempotent operation outcome.
 * @param {{ reservation: { status: string }, outcome: 'success'|'failure'|'ambiguous' }} input Outcome input.
 * @returns {object} Updated reservation state.
 */
export function resolveReservation(input) {
  let next = 'needs_recovery';
  if (input.outcome === 'success') next = 'settled';
  if (input.outcome === 'failure') next = 'released';
  const result = applyStateTransition({
    kind: 'operation',
    state: input.reservation.status,
    nextState: next,
  });
  return {
    ...input.reservation,
    status: result.state,
    previousStatus: result.previousState,
  };
}
