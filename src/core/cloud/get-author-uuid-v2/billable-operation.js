/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
import { createAuthorUuidResponse } from './response.js';

const OPERATION_TYPE = 'get-author-uuid-v2';

/**
 * @typedef {{ getCurrentPricingSnapshot: () => Promise<object|null>, reserveOperation: (allowEffects: AllowEffects, input: object) => Promise<{status: number, body: Record<string, unknown>}>, resolveOperation: (allowEffects: AllowEffects, input: object) => Promise<{status: number, body: Record<string, unknown>}> }} BillingService
 * @typedef {Parameters<typeof handleBillableAuthorUuidRequest>[0] & {billing: BillingService, resolveBillingIdentity: (allowEffects: AllowEffects, uid: string) => Promise<string|null>}} BillableOperationInput
 */

/**
 * Reserve the configured operation price before resolving or creating an author UUID.
 * @param {{allowEffects: AllowEffects, request: {get?: (name: string) => string|null|undefined, headers?: Record<string, string|string[]|undefined>}, uid: string, billing?: BillingService, resolveBillingIdentity?: (allowEffects: AllowEffects, uid: string) => Promise<string|null>, readAuthorUuid: (allowEffects: AllowEffects, uid: string) => Promise<string|null>, resolveUuid: (allowEffects: AllowEffects, uid: string) => Promise<string>}} input Handler dependencies.
 * @returns {Promise<{status: number, body: string|Record<string, unknown>}>} Handler response.
 */
export async function handleBillableAuthorUuidRequest(input) {
  const idempotencyKey = readIdempotencyKey(input.request);
  if (!idempotencyKey)
    return { status: 400, body: { error: 'idempotency_key_required' } };
  if (!input.billing || typeof input.resolveBillingIdentity !== 'function')
    return { status: 503, body: { error: 'billing_unavailable' } };
  const operationInput = /** @type {BillableOperationInput} */ (input);

  const identityLookup = await operationInput
    .resolveBillingIdentity(operationInput.allowEffects, operationInput.uid)
    .then(
      billingUuid => ({ billingUuid }),
      () => ({ failed: true })
    );
  if ('failed' in identityLookup)
    return { status: 503, body: { error: 'billing_identity_unavailable' } };
  const billingUuid = identityLookup.billingUuid;
  if (!billingUuid)
    return { status: 409, body: { error: 'billing_identity_unavailable' } };

  let pricingSnapshot;
  try {
    pricingSnapshot = await operationInput.billing.getCurrentPricingSnapshot();
  } catch {
    return { status: 503, body: { error: 'pricing_unavailable' } };
  }
  if (!pricingSnapshot)
    return { status: 503, body: { error: 'pricing_unavailable' } };

  const operationAttemptId = `${OPERATION_TYPE}:${idempotencyKey}`;
  let reservation;
  try {
    reservation = await operationInput.billing.reserveOperation(
      operationInput.allowEffects,
      {
        uuid: billingUuid,
        eventId: `${operationAttemptId}:reserve`,
        operationType: OPERATION_TYPE,
        operationAttemptId,
        pricingSnapshot,
      }
    );
  } catch {
    return rejectUnknownReservation(
      operationInput,
      billingUuid,
      operationAttemptId
    );
  }
  if (reservation.status !== 200) return reservation;
  if (reservation.body.duplicate === true) {
    return resumeExistingOperation(
      operationInput,
      billingUuid,
      operationAttemptId,
      reservation.body.status
    );
  }
  if (
    reservation.body.status !== 'reserved' ||
    reservation.body.applied !== true
  )
    return rejectUnknownReservation(
      operationInput,
      billingUuid,
      operationAttemptId
    );

  let uuid;
  try {
    uuid = await operationInput.resolveUuid(
      operationInput.allowEffects,
      operationInput.uid
    );
  } catch {
    await resolveAmbiguousOperation(
      operationInput,
      billingUuid,
      operationAttemptId
    );
    return { status: 503, body: { error: 'operation_outcome_unknown' } };
  }

  return operationResponse(
    uuid,
    await resolveOperation(
      operationInput,
      billingUuid,
      operationAttemptId,
      'success'
    )
  );
}

/**
 * Return the stored result for a previously reserved attempt without re-running its write.
 * @param {BillableOperationInput} input Handler dependencies.
 * @param {string} billingUuid Billing identity.
 * @param {string} operationAttemptId Stable operation attempt id.
 * @param {unknown} status Stored reservation status.
 * @returns {Promise<{status: number, body: string|Record<string, unknown>}>} Handler response.
 */
async function resumeExistingOperation(
  input,
  billingUuid,
  operationAttemptId,
  status
) {
  if (
    status !== 'settled' &&
    status !== 'reserved' &&
    status !== 'needs_recovery'
  )
    return { status: 409, body: { error: 'idempotency_key_conflict' } };

  let uuid;
  try {
    uuid = await input.readAuthorUuid(input.allowEffects, input.uid);
  } catch {
    return { status: 503, body: { error: 'operation_result_unavailable' } };
  }
  if (!uuid)
    return { status: 409, body: { error: 'operation_result_unavailable' } };

  const settled =
    status === 'settled' ||
    (await resolveOperation(input, billingUuid, operationAttemptId, 'success'));
  return operationResponse(uuid, settled);
}

/**
 * Return a UUID only after billing settlement is confirmed.
 * @param {string} uuid Stored author UUID.
 * @param {boolean} settled Whether the operation is settled.
 * @returns {{status: number, body: string|Record<string, unknown>}} Operation response.
 */
function operationResponse(uuid, settled) {
  if (!settled)
    return { status: 503, body: { error: 'operation_settlement_pending' } };
  return createAuthorUuidResponse(uuid);
}

/**
 * Mark the reservation ambiguous and return its stable error response.
 * @param {BillableOperationInput} input Handler dependencies.
 * @param {string} billingUuid Billing identity.
 * @param {string} operationAttemptId Stable operation attempt id.
 * @returns {Promise<{status: number, body: {error: string}}>} Fail-closed response.
 */
async function rejectUnknownReservation(
  input,
  billingUuid,
  operationAttemptId
) {
  await resolveAmbiguousOperation(input, billingUuid, operationAttemptId);
  return { status: 503, body: { error: 'reservation_outcome_unknown' } };
}

/**
 * Resolve a reservation and verify its resulting state.
 * @param {BillableOperationInput} input Handler dependencies.
 * @param {string} billingUuid Billing identity.
 * @param {string} operationAttemptId Stable operation attempt id.
 * @param {'success'|'ambiguous'} outcome Reservation outcome.
 * @returns {Promise<boolean>} Whether the reservation reached the requested state.
 */
async function resolveOperation(
  input,
  billingUuid,
  operationAttemptId,
  outcome
) {
  try {
    const result = await input.billing.resolveOperation(input.allowEffects, {
      uuid: billingUuid,
      eventId: `${operationAttemptId}:${outcome}`,
      operationType: OPERATION_TYPE,
      operationAttemptId,
      outcome,
    });
    if (result.status !== 200) return false;
    if (outcome === 'ambiguous')
      return (
        result.body.status === 'needs_recovery' ||
        result.body.duplicate === true
      );
    return result.body.status === 'settled' || result.body.duplicate === true;
  } catch {
    return false;
  }
}

/**
 * Record that a failure may have occurred after a reservation was written.
 * @param {BillableOperationInput} input Handler dependencies.
 * @param {string} billingUuid Billing identity.
 * @param {string} operationAttemptId Stable operation attempt id.
 * @returns {Promise<void>} Completes after best-effort recovery marking.
 */
async function resolveAmbiguousOperation(
  input,
  billingUuid,
  operationAttemptId
) {
  await resolveOperation(input, billingUuid, operationAttemptId, 'ambiguous');
}

/**
 * Read and validate the caller supplied idempotency key.
 * @param {{get?: (name: string) => string|null|undefined, headers?: Record<string, string|string[]|undefined>}} request Incoming request.
 * @returns {string|null} Safe key or null.
 */
function readIdempotencyKey(request) {
  const header =
    request.get?.('idempotency-key') ??
    request.headers?.['idempotency-key'] ??
    request.headers?.['Idempotency-Key'];
  if (typeof header !== 'string') return null;
  const key = header.trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(key) ? key : null;
}
