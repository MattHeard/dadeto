import { describe, expect, it, jest } from '@jest/globals';
import { createBillingRefundRequestHandler } from '../../../../src/core/cloud/billing/refund-request-core.js';

const allowEffects = Object.freeze({ testPermission: true });
const request = {
  authorization: 'Bearer valid-token',
  purchaseId: 'purchase-1',
  idempotencyKey: 'customer-retry-key-123',
};

/**
 * @param {Record<string, unknown>} [overrides] Dependency overrides.
 * @returns {Record<string, any>} Handler dependencies.
 */
function createDeps(overrides = {}) {
  return {
    billingEnabled: true,
    stripeConfigured: true,
    sha256Utf8: jest.fn(() => 'a'.repeat(64)),
    verifyIdToken: jest.fn(async () => ({ uid: 'user-1' })),
    getPurchase: jest.fn(async () => ({ uid: 'user-1' })),
    createRefundIntent: jest.fn(async (_permission, input) => ({
      status: 201,
      body: {
        refundIntent: {
          ...input,
          apiKeyUuid: 'key-1',
          stripePaymentIntentId: 'pi-1',
          amountUsdMinor: 250,
          status: 'requested',
        },
      },
    })),
    createStripeRefund: jest.fn(async () => ({
      id: 're-1',
      status: 'pending',
    })),
    recordRefundSubmission: jest.fn(async (_permission, input) => ({
      status: 200,
      body: { refundIntent: { ...input, status: 'submitted' } },
    })),
    markRefundIntentAmbiguous: jest.fn(async () => ({ status: 200, body: {} })),
    ...overrides,
  };
}

describe('createBillingRefundRequestHandler', () => {
  it('rejects malformed purchase identifiers and bearer headers', async () => {
    const deps = createDeps();
    const handle = createBillingRefundRequestHandler(deps);
    await expect(
      handle(allowEffects, { ...request, purchaseId: 'invalid/id' })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'invalid_purchase_id' },
    });
    await expect(
      handle(allowEffects, { ...request, authorization: 'not a bearer token' })
    ).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
    expect(deps.createRefundIntent).not.toHaveBeenCalled();
  });

  it('requires authentication and a stable idempotency key', async () => {
    const deps = createDeps();
    const handle = createBillingRefundRequestHandler(deps);
    await expect(
      handle(allowEffects, { ...request, authorization: undefined })
    ).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
    await expect(
      handle(allowEffects, { ...request, idempotencyKey: '' })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'idempotency_key_required' },
    });
    expect(deps.createRefundIntent).not.toHaveBeenCalled();
  });

  it('hides purchases owned by another user without creating a refund', async () => {
    const deps = createDeps({
      getPurchase: jest.fn(async () => ({ uid: 'somebody-else' })),
    });
    const handle = createBillingRefundRequestHandler(deps);
    await expect(handle(allowEffects, request)).resolves.toEqual({
      status: 404,
      body: { error: 'purchase_not_found' },
    });
    expect(deps.createRefundIntent).not.toHaveBeenCalled();
    expect(deps.sha256Utf8).not.toHaveBeenCalled();
    expect(deps.createStripeRefund).not.toHaveBeenCalled();
  });

  it('rejects authenticated claims without a usable user id', async () => {
    const deps = createDeps({
      verifyIdToken: jest.fn(async () => ({})),
      getPurchase: jest.fn(async () => ({})),
    });
    const handle = createBillingRefundRequestHandler(deps);
    await expect(handle(allowEffects, request)).resolves.toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
  });

  it('surfaces invalid persisted intent results without calling Stripe', async () => {
    for (const body of [{}, { refundIntent: null }]) {
      const deps = createDeps({
        createRefundIntent: jest.fn(async () => ({ status: 201, body })),
      });
      const handle = createBillingRefundRequestHandler(deps);
      await expect(handle(allowEffects, request)).resolves.toEqual({
        status: 500,
        body: { error: 'invalid_refund_intent_result' },
      });
      expect(deps.createStripeRefund).not.toHaveBeenCalled();
    }
  });

  it('returns a failed intent result and skips Stripe', async () => {
    const deps = createDeps({
      createRefundIntent: jest.fn(async () => ({
        status: 503,
        body: { error: 'billing_unavailable' },
      })),
    });
    const handle = createBillingRefundRequestHandler(deps);
    await expect(handle(allowEffects, request)).resolves.toEqual({
      status: 503,
      body: { error: 'billing_unavailable' },
    });
    expect(deps.createStripeRefund).not.toHaveBeenCalled();
  });

  it('does not resubmit an intent that is already terminal', async () => {
    const deps = createDeps({
      createRefundIntent: jest.fn(async (_permission, input) => ({
        status: 200,
        body: {
          refundIntent: { ...input, status: 'applied' },
        },
      })),
    });
    const handle = createBillingRefundRequestHandler(deps);
    await expect(handle(allowEffects, request)).resolves.toMatchObject({
      status: 200,
      body: { duplicate: true, refundIntent: { status: 'applied' } },
    });
    expect(deps.createStripeRefund).not.toHaveBeenCalled();
  });

  it('records a Stripe refund when the provider omits its status', async () => {
    const deps = createDeps({
      createStripeRefund: jest.fn(async () => ({ id: 're-no-status' })),
    });
    const handle = createBillingRefundRequestHandler(deps);
    await expect(handle(allowEffects, request)).resolves.toMatchObject({
      status: 200,
    });
    expect(deps.recordRefundSubmission).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({
        stripeRefundId: 're-no-status',
        stripeStatus: 'unknown',
      })
    );
  });

  it('creates the intent before requesting the exact Stripe refund with a stable key', async () => {
    const deps = createDeps();
    const handle = createBillingRefundRequestHandler(deps);
    await expect(handle(allowEffects, request)).resolves.toMatchObject({
      status: 200,
      body: { refundIntent: { status: 'submitted', stripeRefundId: 're-1' } },
    });
    const intentInput = deps.createRefundIntent.mock.calls[0][1];
    expect(intentInput).toMatchObject({ purchaseId: 'purchase-1' });
    expect(intentInput.refundIntentId).toMatch(/^refund-[a-f0-9]{64}$/);
    expect(deps.createStripeRefund).toHaveBeenCalledWith(
      allowEffects,
      {
        ['payment_intent']: 'pi-1',
        amount: 250,
        reason: 'requested_by_customer',
        metadata: {
          ['purchase_id']: 'purchase-1',
          ['refund_intent_id']: intentInput.refundIntentId,
        },
      },
      { idempotencyKey: `dadeto-refund-${intentInput.refundIntentId}` }
    );
    expect(deps.recordRefundSubmission).toHaveBeenCalledWith(allowEffects, {
      refundIntentId: intentInput.refundIntentId,
      stripeRefundId: 're-1',
      stripeStatus: 'pending',
    });
    expect(deps.createRefundIntent.mock.invocationCallOrder[0]).toBeLessThan(
      deps.createStripeRefund.mock.invocationCallOrder[0]
    );
  });

  it('retries ambiguous Stripe calls with the same intent and idempotency key', async () => {
    const createStripeRefund = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce({ id: 're-retried', status: 'pending' });
    let hasAttempted = false;
    const createRefundIntent = jest.fn(async (_permission, input) => {
      const status = hasAttempted ? 'ambiguous' : 'requested';
      hasAttempted = true;
      return {
        status: status === 'requested' ? 201 : 200,
        body: {
          duplicate: status === 'ambiguous',
          refundIntent: {
            ...input,
            stripePaymentIntentId: 'pi-1',
            amountUsdMinor: 250,
            status,
          },
        },
      };
    });
    const deps = createDeps({ createStripeRefund, createRefundIntent });
    const handle = createBillingRefundRequestHandler(deps);

    const first = await handle(allowEffects, request);
    const refundIntentId = createRefundIntent.mock.calls[0][1].refundIntentId;
    expect(first).toEqual({
      status: 503,
      body: {
        error: 'refund_submission_ambiguous',
        refundIntentId,
      },
    });
    await expect(handle(allowEffects, request)).resolves.toMatchObject({
      status: 200,
      body: { refundIntent: { stripeRefundId: 're-retried' } },
    });
    expect(deps.markRefundIntentAmbiguous).toHaveBeenCalledWith(
      allowEffects,
      refundIntentId
    );
    expect(createStripeRefund.mock.calls[0][2]).toEqual(
      createStripeRefund.mock.calls[1][2]
    );
  });

  it('does not call Stripe when billing is disabled or not configured', async () => {
    for (const config of [
      { billingEnabled: false },
      { stripeConfigured: false },
    ]) {
      const deps = createDeps(config);
      const handle = createBillingRefundRequestHandler(deps);
      await expect(handle(allowEffects, request)).resolves.toMatchObject({
        status: 503,
      });
      expect(deps.createStripeRefund).not.toHaveBeenCalled();
      expect(deps.sha256Utf8).not.toHaveBeenCalled();
    }
  });
});

it('hashes the authenticated tuple and forwards the derived identity with permission', async () => {
  const digest = 'b'.repeat(64);
  const sha256Utf8 = jest.fn(() => digest);
  const deps = createDeps({ sha256Utf8 });
  const handle = createBillingRefundRequestHandler(deps);
  await handle(allowEffects, {
    ...request,
    idempotencyKey: ' \t customer-key \n',
  });
  expect(sha256Utf8).toHaveBeenCalledTimes(1);
  expect(sha256Utf8).toHaveBeenCalledWith(
    'user-1\u0000purchase-1\u0000customer-key'
  );
  expect(deps.createRefundIntent).toHaveBeenCalledWith(allowEffects, {
    refundIntentId: `refund-${digest}`,
    purchaseId: 'purchase-1',
  });
});

it('propagates hashing failures before creating a refund intent', async () => {
  const failure = new Error('hash unavailable');
  const deps = createDeps({
    sha256Utf8: () => {
      throw failure;
    },
  });
  const handle = createBillingRefundRequestHandler(deps);
  await expect(handle(allowEffects, request)).rejects.toBe(failure);
  expect(deps.createRefundIntent).not.toHaveBeenCalled();
  expect(deps.createStripeRefund).not.toHaveBeenCalled();
  expect(deps.markRefundIntentAmbiguous).not.toHaveBeenCalled();
});
