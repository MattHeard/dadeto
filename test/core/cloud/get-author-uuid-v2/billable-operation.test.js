import { describe, expect, it, jest } from '@jest/globals';
import { handleBillableAuthorUuidRequest } from '../../../../src/core/cloud/get-author-uuid-v2/billable-operation.js';

const allowEffects = Object.freeze({ request: true });

/**
 * Create the shared fake billing request used by the operation tests.
 * @param {Record<string, unknown>} [overrides] Dependency overrides.
 * @returns {{input: Record<string, any>, billing: Record<string, any>}} Test inputs.
 */
function createInput(overrides = {}) {
  const billing = {
    getCurrentPricingSnapshot: jest
      .fn()
      .mockResolvedValue({ snapshotId: 'price-1' }),
    reserveOperation: jest.fn().mockResolvedValue({
      status: 200,
      body: { status: 'reserved', applied: true },
    }),
    resolveOperation: jest.fn().mockResolvedValue({
      status: 200,
      body: { status: 'settled' },
    }),
  };
  const input = {
    allowEffects,
    request: { get: name => (name === 'idempotency-key' ? 'retry-1' : null) },
    uid: 'user-1',
    billing,
    resolveBillingIdentity: jest.fn().mockResolvedValue('api-key-1'),
    readAuthorUuid: jest.fn().mockResolvedValue(null),
    resolveUuid: jest.fn().mockResolvedValue('author-uuid-1'),
  };
  return { input: { ...input, ...overrides }, billing };
}

describe('handleBillableAuthorUuidRequest', () => {
  it('rejects missing or invalid idempotency keys before billing', async () => {
    const missing = createInput({ request: {} });
    await expect(
      handleBillableAuthorUuidRequest(missing.input)
    ).resolves.toEqual({
      status: 400,
      body: { error: 'idempotency_key_required' },
    });
    expect(missing.billing.reserveOperation).not.toHaveBeenCalled();

    const invalid = createInput({
      request: { headers: { 'idempotency-key': 'bad/key' } },
    });
    await expect(
      handleBillableAuthorUuidRequest(invalid.input)
    ).resolves.toEqual({
      status: 400,
      body: { error: 'idempotency_key_required' },
    });

    const arrayHeader = createInput({
      request: { headers: { 'idempotency-key': ['retry-1'] } },
    });
    await expect(
      handleBillableAuthorUuidRequest(arrayHeader.input)
    ).resolves.toEqual({
      status: 400,
      body: { error: 'idempotency_key_required' },
    });
  });

  it('reads a case-insensitive header map when no request getter is available', async () => {
    const { input, billing } = createInput({
      request: { headers: { 'Idempotency-Key': 'retry-upper' } },
    });
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 200,
      body: { uuid: 'author-uuid-1' },
    });
    expect(billing.reserveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({
        operationAttemptId: 'get-author-uuid-v2:retry-upper',
      })
    );
  });

  it('fails closed when billing dependencies are unavailable', async () => {
    const noBilling = createInput({ billing: null });
    await expect(
      handleBillableAuthorUuidRequest(noBilling.input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'billing_unavailable' },
    });

    const noIdentityResolver = createInput({ resolveBillingIdentity: null });
    await expect(
      handleBillableAuthorUuidRequest(noIdentityResolver.input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'billing_unavailable' },
    });
  });

  it('fails closed when ownership lookup fails or has no billing identity', async () => {
    const lookupError = createInput({
      resolveBillingIdentity: jest.fn().mockRejectedValue(new Error('offline')),
    });
    await expect(
      handleBillableAuthorUuidRequest(lookupError.input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'billing_identity_unavailable' },
    });

    const noIdentity = createInput({
      resolveBillingIdentity: jest.fn().mockResolvedValue(null),
    });
    await expect(
      handleBillableAuthorUuidRequest(noIdentity.input)
    ).resolves.toEqual({
      status: 409,
      body: { error: 'billing_identity_unavailable' },
    });
  });

  it('fails before reserving when the current pricing snapshot is missing or unavailable', async () => {
    const noSnapshot = createInput();
    noSnapshot.billing.getCurrentPricingSnapshot.mockResolvedValue(null);
    await expect(
      handleBillableAuthorUuidRequest(noSnapshot.input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'pricing_unavailable' },
    });

    const snapshotError = createInput();
    snapshotError.billing.getCurrentPricingSnapshot.mockRejectedValue(
      new Error('offline')
    );
    await expect(
      handleBillableAuthorUuidRequest(snapshotError.input)
    ).resolves.toEqual({ status: 503, body: { error: 'pricing_unavailable' } });
  });

  it('returns a failed reservation without executing the author operation', async () => {
    const { input, billing } = createInput();
    billing.reserveOperation.mockResolvedValue({
      status: 409,
      body: { error: 'insufficient_credit' },
    });
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 409,
      body: { error: 'insufficient_credit' },
    });
    expect(input.resolveUuid).not.toHaveBeenCalled();
  });

  it('reserves, runs, and settles the configured operation', async () => {
    const { input, billing } = createInput();
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 200,
      body: { uuid: 'author-uuid-1' },
    });
    expect(billing.reserveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({
        uuid: 'api-key-1',
        operationType: 'get-author-uuid-v2',
        operationAttemptId: 'get-author-uuid-v2:retry-1',
        eventId: 'get-author-uuid-v2:retry-1:reserve',
        pricingSnapshot: { snapshotId: 'price-1' },
      })
    );
    expect(input.resolveUuid).toHaveBeenCalledTimes(1);
    expect(billing.resolveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ outcome: 'success' })
    );
  });

  it('marks an ambiguous reservation result for recovery without executing', async () => {
    const { input, billing } = createInput();
    billing.reserveOperation.mockRejectedValue(
      new Error('transaction timeout')
    );
    billing.resolveOperation.mockResolvedValue({
      status: 200,
      body: { status: 'needs_recovery' },
    });
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 503,
      body: { error: 'reservation_outcome_unknown' },
    });
    expect(input.resolveUuid).not.toHaveBeenCalled();
    expect(billing.resolveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ outcome: 'ambiguous' })
    );
  });

  it('marks a malformed reservation response for recovery', async () => {
    const { input, billing } = createInput();
    billing.reserveOperation.mockResolvedValue({ status: 200, body: {} });
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 503,
      body: { error: 'reservation_outcome_unknown' },
    });
    expect(input.resolveUuid).not.toHaveBeenCalled();
  });

  it('marks a failed operation ambiguous and returns the stored result on retry', async () => {
    const { input, billing } = createInput();
    let storedUuid = null;
    input.resolveUuid.mockRejectedValue(new Error('write response lost'));
    billing.resolveOperation
      .mockResolvedValueOnce({
        status: 200,
        body: { status: 'needs_recovery' },
      })
      .mockResolvedValueOnce({ status: 200, body: { status: 'settled' } });
    const first = await handleBillableAuthorUuidRequest(input);
    expect(first).toEqual({
      status: 503,
      body: { error: 'operation_outcome_unknown' },
    });
    storedUuid = 'author-uuid-1';
    billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'needs_recovery' },
    });
    input.readAuthorUuid.mockImplementation(async () => storedUuid);
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 200,
      body: { uuid: 'author-uuid-1' },
    });
    expect(input.resolveUuid).toHaveBeenCalledTimes(1);
    expect(billing.resolveOperation).toHaveBeenCalledTimes(2);
  });

  it('returns a settled duplicate from storage without another operation or write', async () => {
    const { input, billing } = createInput();
    billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'settled' },
    });
    input.readAuthorUuid.mockResolvedValue('author-uuid-1');
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 200,
      body: { uuid: 'author-uuid-1' },
    });
    expect(input.resolveUuid).not.toHaveBeenCalled();
    expect(billing.resolveOperation).not.toHaveBeenCalled();
  });

  it('does not re-execute an incomplete duplicate when no stored result is available', async () => {
    const { input, billing } = createInput();
    billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'reserved' },
    });
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 409,
      body: { error: 'operation_result_unavailable' },
    });
    expect(input.resolveUuid).not.toHaveBeenCalled();
    expect(billing.resolveOperation).not.toHaveBeenCalled();
  });

  it('rejects duplicate attempts with terminal failure states or unavailable results', async () => {
    const conflict = createInput();
    conflict.billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'released' },
    });
    await expect(
      handleBillableAuthorUuidRequest(conflict.input)
    ).resolves.toEqual({
      status: 409,
      body: { error: 'idempotency_key_conflict' },
    });

    const readFailure = createInput();
    readFailure.billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'reserved' },
    });
    readFailure.input.readAuthorUuid.mockRejectedValue(new Error('offline'));
    await expect(
      handleBillableAuthorUuidRequest(readFailure.input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'operation_result_unavailable' },
    });
  });

  it('reports incomplete settlement without repeating the author operation', async () => {
    const { input, billing } = createInput();
    billing.resolveOperation.mockResolvedValue({
      status: 409,
      body: { error: 'operation_identity_conflict' },
    });
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 503,
      body: { error: 'operation_settlement_pending' },
    });
    expect(input.resolveUuid).toHaveBeenCalledTimes(1);
  });

  it('returns the stored result only after a duplicate reservation is settled', async () => {
    const { input, billing } = createInput();
    billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'reserved' },
    });
    billing.resolveOperation.mockResolvedValue({
      status: 409,
      body: { error: 'reservation_conflict' },
    });
    input.readAuthorUuid.mockResolvedValue('author-uuid-1');
    await expect(handleBillableAuthorUuidRequest(input)).resolves.toEqual({
      status: 503,
      body: { error: 'operation_settlement_pending' },
    });
    expect(input.resolveUuid).not.toHaveBeenCalled();
  });

  it('accepts duplicate settlement and fails closed when settlement transport errors', async () => {
    const duplicate = createInput();
    duplicate.billing.resolveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true },
    });
    await expect(
      handleBillableAuthorUuidRequest(duplicate.input)
    ).resolves.toEqual({ status: 200, body: { uuid: 'author-uuid-1' } });

    const transportError = createInput();
    transportError.billing.resolveOperation.mockRejectedValue(
      new Error('settlement response lost')
    );
    await expect(
      handleBillableAuthorUuidRequest(transportError.input)
    ).resolves.toEqual({
      status: 503,
      body: { error: 'operation_settlement_pending' },
    });
  });
});
