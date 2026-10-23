import { applyStateTransition } from './billing-protocol-core.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Check whether a response confirms a newly applied operation reservation.
 * @param {{body?: {status?: string, applied?: boolean}}} result Billing response.
 * @returns {boolean} Whether the operation is reserved and applied.
 */
export function isOperationReservationConfirmed(result) {
  return result.body?.status === 'reserved' && result.body.applied === true;
}

/**
 * Check whether a billing response confirms the requested operation outcome.
 * @param {{status?: number, body?: {status?: string, duplicate?: boolean}}} result Billing response.
 * @param {'success'|'ambiguous'} outcome Requested outcome.
 * @returns {boolean} Whether billing confirms the requested outcome.
 */
export function isOperationResolutionComplete(result, outcome) {
  if (result.status !== 200) return false;
  if (outcome === 'ambiguous')
    return (
      result.body?.status === 'needs_recovery' ||
      result.body?.duplicate === true
    );
  return result.body?.status === 'settled' || result.body?.duplicate === true;
}

/**
 * Request and verify a billable operation outcome through its injected service.
 * @param {{billing: {resolveOperation: (allowEffects: AllowEffects, input: object) => Promise<{status: number, body?: {status?: string, duplicate?: boolean}} >}, allowEffects: AllowEffects, uuid: string, operationType: string, operationAttemptId: string, outcome: 'success'|'ambiguous'}} input Resolution dependencies and operation identity.
 * @returns {Promise<boolean>} Whether the service confirmed the outcome.
 */
export async function resolveOperationOutcome(input) {
  try {
    const result = await input.billing.resolveOperation(input.allowEffects, {
      uuid: input.uuid,
      eventId: `${input.operationAttemptId}:${input.outcome}`,
      operationType: input.operationType,
      operationAttemptId: input.operationAttemptId,
      outcome: input.outcome,
    });
    return isOperationResolutionComplete(result, input.outcome);
  } catch {
    return false;
  }
}

/**
 * Create a new operation reservation.
 * @param {{ operationType: string, operationAttemptId: string, billingIdentityId: string, amount: number, allocations: Array<object>, pricingSnapshotId: string, createdAt: string|Date }} input Reservation input.
 * @returns {object} Reservation.
 */
export function createReservation(input) {
  if (
    !input.operationType ||
    !input.operationAttemptId ||
    !input.billingIdentityId
  )
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
